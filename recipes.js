(function () {
  'use strict';

  const PROTOTYPE_RECIPES_KEY = 'masofishPrototypeRecipesV1';
  const PROTOTYPE_FAVORITES_KEY = 'masofishPrototypeRecipeFavoritesV1';
  const RECIPE_BUCKET = 'recipe-images';
  const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

  const byId = id => document.getElementById(id);
  const detailModal = byId('recipeDetailModal');
  const adminModal = byId('recipeAdminModal');

  const state = {
    mode: 'loading',
    client: null,
    user: null,
    role: 'user',
    recipes: [],
    favorites: [],
    search: '',
    category: 'all',
    sort: 'newest',
    editing: null,
    schemaReady: true
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
  }

  function lines(value) {
    return String(value || '').split('\n').map(line => line.trim()).filter(Boolean);
  }

  function categoryLabel(value) {
    return {
      quick: 'Quick Meals',
      traditional: 'Traditional',
      grilled: 'Grilled',
      soup: 'Soup',
      smoked: 'Smoked',
      other: 'Other'
    }[value] || 'Other';
  }

  function seedRecipes() {
    return [
      {
        id: 'prototype-recipe-1',
        slug: 'grilled-rabbitfish-calamansi',
        name: 'Grilled Rabbitfish with Calamansi',
        fish_name: 'Rabbitfish',
        category: 'grilled',
        description: 'A simple Filipino-style grilled rabbitfish seasoned with calamansi, garlic, salt, and pepper.',
        ingredients: ['2 cleaned rabbitfish', '4 calamansi, juiced', '3 cloves garlic, minced', '1 teaspoon salt', '1/2 teaspoon black pepper', '1 tablespoon cooking oil'],
        instructions: ['Score both sides of the cleaned fish.', 'Mix calamansi juice, garlic, salt, pepper, and oil.', 'Rub the mixture over the fish and marinate for 20 minutes.', 'Grill over medium heat until cooked through, turning carefully.', 'Serve immediately with rice and a dipping sauce.'],
        prep_time_minutes: 35,
        difficulty: 'easy',
        servings: 3,
        image_url: null,
        image_path: null,
        published: true,
        favorite_count: 2,
        created_at: new Date(Date.now() - 7 * 86400000).toISOString()
      },
      {
        id: 'prototype-recipe-2',
        slug: 'sinigang-na-bangus',
        name: 'Sinigang na Bangus',
        fish_name: 'Milkfish',
        category: 'traditional',
        description: 'A comforting sour soup with milkfish, tomatoes, vegetables, and tamarind broth.',
        ingredients: ['1 medium milkfish, cleaned and cut', '6 cups water', '2 tomatoes, quartered', '1 onion, sliced', '1 packet tamarind soup base or fresh tamarind', '1 radish, sliced', '1 bunch water spinach', '2 green chilies', 'Fish sauce to taste'],
        instructions: ['Bring water, tomatoes, and onion to a boil.', 'Add radish and cook until nearly tender.', 'Add the milkfish and simmer gently.', 'Stir in tamarind and season with fish sauce.', 'Add green chilies and water spinach, then cook briefly before serving.'],
        prep_time_minutes: 45,
        difficulty: 'medium',
        servings: 5,
        image_url: null,
        image_path: null,
        published: true,
        favorite_count: 4,
        created_at: new Date(Date.now() - 6 * 86400000).toISOString()
      },
      {
        id: 'prototype-recipe-3',
        slug: 'crispy-tilapia-garlic-sauce',
        name: 'Crispy Tilapia with Garlic Sauce',
        fish_name: 'Tilapia',
        category: 'quick',
        description: 'Pan-fried tilapia finished with a savory garlic, soy, and calamansi sauce.',
        ingredients: ['1 whole tilapia, cleaned', 'Salt and pepper', 'Cooking oil', '5 cloves garlic, minced', '2 tablespoons soy sauce', '2 tablespoons calamansi juice', '1 teaspoon brown sugar'],
        instructions: ['Pat the tilapia dry and season with salt and pepper.', 'Fry until golden and cooked through, then drain.', 'Sauté garlic in a small amount of oil.', 'Add soy sauce, calamansi juice, and sugar.', 'Pour the sauce over the fish and serve.'],
        prep_time_minutes: 30,
        difficulty: 'easy',
        servings: 3,
        image_url: null,
        image_path: null,
        published: true,
        favorite_count: 3,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: 'prototype-recipe-4',
        slug: 'ginataang-eel',
        name: 'Ginataang Eel',
        fish_name: 'Eel',
        category: 'traditional',
        description: 'Tender eel simmered in coconut milk with ginger, chilies, and leafy vegetables.',
        ingredients: ['700 g cleaned eel, cut into pieces', '2 cups coconut milk', '1 thumb ginger, sliced', '1 onion, sliced', '3 cloves garlic', '2 green chilies', 'Leafy vegetables', 'Salt and pepper'],
        instructions: ['Sauté garlic, onion, and ginger.', 'Add eel pieces and cook briefly.', 'Pour in coconut milk and simmer gently.', 'Add chilies and season.', 'Add vegetables near the end and cook until tender.'],
        prep_time_minutes: 50,
        difficulty: 'medium',
        servings: 4,
        image_url: null,
        image_path: null,
        published: true,
        favorite_count: 1,
        created_at: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id: 'prototype-recipe-5',
        slug: 'steamed-mullet-ginger',
        name: 'Steamed Mullet with Ginger',
        fish_name: 'Mullet',
        category: 'quick',
        description: 'A light steamed-fish recipe with ginger, spring onions, and a simple soy dressing.',
        ingredients: ['1 whole mullet, cleaned', '1 thumb ginger, julienned', '2 spring onions', '2 tablespoons soy sauce', '1 tablespoon calamansi juice', '1 teaspoon sesame oil'],
        instructions: ['Place fish on a heatproof plate and top with ginger.', 'Steam until the flesh flakes easily.', 'Mix soy sauce, calamansi juice, and sesame oil.', 'Pour dressing over the fish and top with spring onions.'],
        prep_time_minutes: 25,
        difficulty: 'easy',
        servings: 3,
        image_url: null,
        image_path: null,
        published: true,
        favorite_count: 0,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      }
    ];
  }

  function readPrototypeRecipes() {
    try {
      const data = JSON.parse(localStorage.getItem(PROTOTYPE_RECIPES_KEY) || 'null');
      if (Array.isArray(data)) return data;
    } catch (_) {}
    const seeded = seedRecipes();
    localStorage.setItem(PROTOTYPE_RECIPES_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function writePrototypeRecipes(items) {
    localStorage.setItem(PROTOTYPE_RECIPES_KEY, JSON.stringify(items));
  }

  function readPrototypeFavorites() {
    try {
      const data = JSON.parse(localStorage.getItem(PROTOTYPE_FAVORITES_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function writePrototypeFavorites(items) {
    localStorage.setItem(PROTOTYPE_FAVORITES_KEY, JSON.stringify(items));
  }

  async function getRole() {
    if (state.mode === 'prototype') return 'admin';

    const { data, error } = await state.client
      .from('profiles')
      .select('role')
      .eq('id', state.user.id)
      .maybeSingle();

    if (error) {
      console.warn('Unable to read recipe role:', error);
      return 'user';
    }
    return data?.role || 'user';
  }

  function isMissingSchema(error) {
    const text = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return text.includes('recipes') || text.includes('does not exist') || text.includes('relation');
  }

  async function loadRealData() {
    const recipesQuery = state.client
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    const favoritesQuery = state.client
      .from('recipe_favorites')
      .select('recipe_id')
      .eq('user_id', state.user.id);

    const [recipesResult, favoritesResult] = await Promise.all([recipesQuery, favoritesQuery]);
    const error = recipesResult.error || favoritesResult.error;
    if (error) throw error;

    state.recipes = recipesResult.data || [];
    state.favorites = (favoritesResult.data || []).map(item => item.recipe_id);
  }

  async function loadData() {
    try {
      if (state.mode === 'prototype') {
        state.recipes = readPrototypeRecipes();
        state.favorites = readPrototypeFavorites();
        state.schemaReady = false;
        byId('recipeDatabaseNotice').hidden = false;
      } else {
        await loadRealData();
        state.schemaReady = true;
        byId('recipeDatabaseNotice').hidden = true;
      }
    } catch (error) {
      if (isMissingSchema(error)) {
        state.mode = 'prototype';
        state.recipes = readPrototypeRecipes();
        state.favorites = readPrototypeFavorites();
        state.schemaReady = false;
        byId('recipeDatabaseNotice').hidden = false;
      } else {
        throw error;
      }
    }
  }

  function favoriteCount(recipe) {
    return Number(recipe.favorite_count || 0);
  }

  function filteredRecipes() {
    let items = state.recipes.filter(recipe => state.role === 'admin' || recipe.published !== false);

    if (state.category === 'favorites') {
      items = items.filter(recipe => state.favorites.includes(recipe.id));
    } else if (state.category !== 'all') {
      items = items.filter(recipe => recipe.category === state.category);
    }

    if (state.search) {
      const term = state.search.toLowerCase();
      items = items.filter(recipe =>
        [recipe.name, recipe.fish_name, recipe.description, ...(recipe.ingredients || [])]
          .some(value => String(value || '').toLowerCase().includes(term))
      );
    }

    if (state.sort === 'quickest') {
      items.sort((a, b) => Number(a.prep_time_minutes || 9999) - Number(b.prep_time_minutes || 9999));
    } else if (state.sort === 'favorites') {
      items.sort((a, b) => favoriteCount(b) - favoriteCount(a));
    } else if (state.sort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return items;
  }

  function recipeImage(recipe) {
    if (recipe.image_url) return recipe.image_url;
    if (recipe.image_path && state.client) {
      return state.client.storage.from(RECIPE_BUCKET).getPublicUrl(recipe.image_path).data.publicUrl;
    }
    return null;
  }

  function render() {
    byId('recipeLoading').hidden = true;
    const items = filteredRecipes();
    byId('recipeStatus').textContent = `${items.length} ${items.length === 1 ? 'recipe' : 'recipes'} shown`;
    byId('recipeEmpty').hidden = items.length > 0;

    byId('recipeGrid').innerHTML = items.map(recipe => {
      const image = recipeImage(recipe);
      const favorite = state.favorites.includes(recipe.id);
      return `
        <article class="rounded-xl border border-outline-variant bg-white overflow-hidden shadow-sm">
          <button type="button" class="open-recipe-button block w-full text-left" data-id="${escapeHtml(recipe.id)}">
            <div class="recipe-image bg-primary-container relative flex items-center justify-center overflow-hidden">
              ${image
                ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(recipe.name)}" class="w-full h-full object-cover"/>`
                : `<span class="material-symbols-outlined text-7xl text-secondary-container/50">restaurant</span>`}
              <span class="absolute top-3 left-3 rounded-full bg-primary/85 text-white px-3 py-1 text-xs font-extrabold">${escapeHtml(categoryLabel(recipe.category))}</span>
              ${recipe.published === false ? `<span class="absolute top-3 right-3 rounded-full bg-amber-100 text-amber-950 px-3 py-1 text-xs font-extrabold">DRAFT</span>` : ''}
            </div>
            <div class="p-4">
              <p class="text-xs uppercase tracking-wider font-extrabold text-secondary">${escapeHtml(recipe.fish_name)}</p>
              <h2 class="text-xl font-black text-primary mt-1">${escapeHtml(recipe.name)}</h2>
              <p class="text-sm text-on-surface-variant mt-2 line-clamp-3">${escapeHtml(recipe.description)}</p>
              <div class="flex flex-wrap gap-4 text-sm text-on-surface-variant mt-4">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">schedule</span>${recipe.prep_time_minutes || '—'} min</span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">restaurant</span>${escapeHtml(recipe.difficulty || 'easy')}</span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">group</span>${recipe.servings || '—'}</span>
              </div>
            </div>
          </button>
          <div class="${state.role === 'admin' ? 'grid grid-cols-3' : 'grid grid-cols-1'} border-t border-outline-variant">
            <button type="button" class="favorite-recipe-button p-3 font-extrabold flex items-center justify-center gap-2 ${favorite ? 'bg-secondary-container/25 text-secondary' : 'text-on-surface-variant'}" data-id="${escapeHtml(recipe.id)}">
              <span class="material-symbols-outlined" style="${favorite ? "font-variation-settings:'FILL' 1;" : ''}">favorite</span>
              ${favorite ? 'Saved' : 'Save'}
            </button>
            ${state.role === 'admin' ? `
              <button type="button" class="edit-recipe-button p-3 font-extrabold text-primary border-l border-outline-variant" data-id="${escapeHtml(recipe.id)}">Edit</button>
              <button type="button" class="delete-recipe-button p-3 font-extrabold text-error border-l border-outline-variant" data-id="${escapeHtml(recipe.id)}">Delete</button>
            ` : ''}
          </div>
        </article>`;
    }).join('');

    document.querySelectorAll('.open-recipe-button').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.id)));
    document.querySelectorAll('.favorite-recipe-button').forEach(button => button.addEventListener('click', () => toggleFavorite(button.dataset.id)));
    document.querySelectorAll('.edit-recipe-button').forEach(button => button.addEventListener('click', () => openAdmin(button.dataset.id)));
    document.querySelectorAll('.delete-recipe-button').forEach(button => button.addEventListener('click', () => deleteRecipe(button.dataset.id)));
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add('recipe-scroll-lock');
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (detailModal.hidden && adminModal.hidden) document.body.classList.remove('recipe-scroll-lock');
  }

  function openDetail(id) {
    const recipe = state.recipes.find(item => item.id === id);
    if (!recipe) return;
    const image = recipeImage(recipe);
    const favorite = state.favorites.includes(recipe.id);

    byId('recipeDetailTitle').textContent = recipe.name;
    byId('recipeDetailContent').innerHTML = `
      ${image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(recipe.name)}" class="w-full max-h-[420px] object-cover"/>`
        : `<div class="h-56 bg-primary-container flex items-center justify-center"><span class="material-symbols-outlined text-8xl text-secondary-container/40">restaurant</span></div>`}
      <div class="p-5 space-y-5">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-secondary-container/35 text-on-secondary-container px-3 py-1 text-xs font-extrabold">${escapeHtml(categoryLabel(recipe.category))}</span>
            <span class="text-xs font-extrabold uppercase tracking-wider text-secondary">${escapeHtml(recipe.fish_name)}</span>
          </div>
          <p class="text-on-surface-variant mt-3">${escapeHtml(recipe.description)}</p>
          <div class="grid grid-cols-3 gap-3 mt-4">
            <div class="rounded-xl bg-surface-container-low p-3 text-center"><span class="material-symbols-outlined text-secondary">schedule</span><strong class="block mt-1">${recipe.prep_time_minutes || '—'} min</strong></div>
            <div class="rounded-xl bg-surface-container-low p-3 text-center"><span class="material-symbols-outlined text-secondary">restaurant</span><strong class="block mt-1 capitalize">${escapeHtml(recipe.difficulty || 'easy')}</strong></div>
            <div class="rounded-xl bg-surface-container-low p-3 text-center"><span class="material-symbols-outlined text-secondary">group</span><strong class="block mt-1">${recipe.servings || '—'} servings</strong></div>
          </div>
        </div>

        <section>
          <h3 class="text-xl font-black text-primary">Ingredients</h3>
          <ul class="list-disc pl-5 mt-3 space-y-2 text-sm">${(recipe.ingredients || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>

        <section>
          <h3 class="text-xl font-black text-primary">Procedure</h3>
          <ol class="list-decimal pl-5 mt-3 space-y-3 text-sm">${(recipe.instructions || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
        </section>

        <button id="detailFavoriteButton" type="button" class="w-full rounded-xl ${favorite ? 'bg-secondary-container text-on-secondary-container' : 'bg-secondary text-white'} p-4 font-extrabold flex items-center justify-center gap-2">
          <span class="material-symbols-outlined" style="${favorite ? "font-variation-settings:'FILL' 1;" : ''}">favorite</span>
          ${favorite ? 'Remove from Favorites' : 'Save to Favorites'}
        </button>

        <aside class="rounded-xl bg-tertiary-fixed text-on-tertiary-fixed p-4 text-sm">
          Ensure the fish was handled properly and follow safe cooking and storage practices.
        </aside>
      </div>`;

    byId('detailFavoriteButton').addEventListener('click', async () => {
      await toggleFavorite(recipe.id);
      openDetail(recipe.id);
    });
    openModal(detailModal);
  }

  async function toggleFavorite(id) {
    const favorite = state.favorites.includes(id);

    if (state.mode === 'prototype') {
      state.favorites = favorite
        ? state.favorites.filter(recipeId => recipeId !== id)
        : [...state.favorites, id];
      writePrototypeFavorites(state.favorites);
      render();
      return;
    }

    if (favorite) {
      const { error } = await state.client
        .from('recipe_favorites')
        .delete()
        .eq('recipe_id', id)
        .eq('user_id', state.user.id);
      if (error) throw error;
      state.favorites = state.favorites.filter(recipeId => recipeId !== id);
    } else {
      const { error } = await state.client
        .from('recipe_favorites')
        .insert({ recipe_id: id, user_id: state.user.id });
      if (error) throw error;
      state.favorites.push(id);
    }
    render();
  }

  function resetAdminForm() {
    state.editing = null;
    byId('recipeAdminForm').reset();
    byId('recipeRecordId').value = '';
    byId('recipeServings').value = '4';
    byId('recipePublished').checked = true;
    byId('recipeAdminTitle').textContent = 'Add Recipe';
    byId('saveRecipeButton').textContent = 'Save Recipe';
    byId('recipeFormMessage').hidden = true;
  }

  function openAdmin(id = null) {
    resetAdminForm();
    if (id) {
      const recipe = state.recipes.find(item => item.id === id);
      if (!recipe) return;
      state.editing = recipe;
      byId('recipeRecordId').value = recipe.id;
      byId('recipeName').value = recipe.name || '';
      byId('recipeFishName').value = recipe.fish_name || '';
      byId('recipeCategory').value = recipe.category || 'other';
      byId('recipePrepTime').value = recipe.prep_time_minutes || '';
      byId('recipeDifficulty').value = recipe.difficulty || 'easy';
      byId('recipeServings').value = recipe.servings || 4;
      byId('recipeImageUrl').value = recipe.image_url || '';
      byId('recipeDescription').value = recipe.description || '';
      byId('recipeIngredients').value = (recipe.ingredients || []).join('\n');
      byId('recipeInstructions').value = (recipe.instructions || []).join('\n');
      byId('recipePublished').checked = recipe.published !== false;
      byId('recipeAdminTitle').textContent = 'Edit Recipe';
      byId('saveRecipeButton').textContent = 'Update Recipe';
    }
    openModal(adminModal);
  }

  async function uploadRecipeImage(file) {
    if (!file) return { image_path: state.editing?.image_path || null, image_url: byId('recipeImageUrl').value.trim() || state.editing?.image_url || null };
    if (file.size > MAX_IMAGE_BYTES) throw new Error('The recipe image is larger than 6 MB.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPEG, PNG, or WebP image.');

    if (state.mode === 'prototype') {
      const imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { image_path: null, image_url: imageUrl };
    }

    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
    const path = `${state.user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
    const { error } = await state.client.storage.from(RECIPE_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;
    return {
      image_path: path,
      image_url: state.client.storage.from(RECIPE_BUCKET).getPublicUrl(path).data.publicUrl
    };
  }

  async function saveRecipe(event) {
    event.preventDefault();
    if (state.role !== 'admin') return;

    const submit = byId('saveRecipeButton');
    submit.disabled = true;
    submit.textContent = state.editing ? 'Updating…' : 'Saving…';

    try {
      const image = await uploadRecipeImage(byId('recipeImageFile').files?.[0] || null);
      const payload = {
        slug: slugify(byId('recipeName').value),
        name: byId('recipeName').value.trim(),
        fish_name: byId('recipeFishName').value.trim(),
        category: byId('recipeCategory').value,
        description: byId('recipeDescription').value.trim(),
        ingredients: lines(byId('recipeIngredients').value),
        instructions: lines(byId('recipeInstructions').value),
        prep_time_minutes: Number(byId('recipePrepTime').value),
        difficulty: byId('recipeDifficulty').value,
        servings: Number(byId('recipeServings').value || 4),
        image_path: image.image_path,
        image_url: image.image_url,
        published: byId('recipePublished').checked
      };

      if (!payload.name || !payload.fish_name || !payload.ingredients.length || !payload.instructions.length) {
        throw new Error('Complete the recipe name, fish, ingredients, and instructions.');
      }

      if (state.mode === 'prototype') {
        if (state.editing) {
          const index = state.recipes.findIndex(item => item.id === state.editing.id);
          state.recipes[index] = { ...state.recipes[index], ...payload, updated_at: new Date().toISOString() };
        } else {
          state.recipes.unshift({
            id: `prototype-recipe-${crypto.randomUUID()}`,
            ...payload,
            favorite_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        writePrototypeRecipes(state.recipes);
      } else if (state.editing) {
        const { error } = await state.client.from('recipes').update(payload).eq('id', state.editing.id);
        if (error) throw error;
        if (byId('recipeImageFile').files?.[0] && state.editing.image_path && state.editing.image_path !== image.image_path) {
          await state.client.storage.from(RECIPE_BUCKET).remove([state.editing.image_path]);
        }
      } else {
        const { error } = await state.client.from('recipes').insert({
          ...payload,
          created_by: state.user.id,
          author_name:
            state.user.user_metadata?.full_name ||
            state.user.user_metadata?.name ||
            state.user.email?.split('@')[0] ||
            'System Administrator'
        });
        if (error) throw error;
      }

      closeModal(adminModal);
      await loadData();
      render();
    } catch (error) {
      const box = byId('recipeFormMessage');
      box.hidden = false;
      box.className = 'rounded-xl border p-3 text-sm bg-red-50 border-red-200 text-red-900';
      box.textContent = error.message || 'The recipe could not be saved.';
    } finally {
      submit.disabled = false;
      submit.textContent = state.editing ? 'Update Recipe' : 'Save Recipe';
    }
  }

  async function deleteRecipe(id) {
    if (state.role !== 'admin' || !confirm('Delete this recipe?')) return;
    const recipe = state.recipes.find(item => item.id === id);

    if (state.mode === 'prototype') {
      state.recipes = state.recipes.filter(item => item.id !== id);
      state.favorites = state.favorites.filter(recipeId => recipeId !== id);
      writePrototypeRecipes(state.recipes);
      writePrototypeFavorites(state.favorites);
      render();
      return;
    }

    const { error } = await state.client.from('recipes').delete().eq('id', id);
    if (error) throw error;
    if (recipe?.image_path) await state.client.storage.from(RECIPE_BUCKET).remove([recipe.image_path]);
    await loadData();
    render();
  }

  async function initialize() {
    const ready = await window.masofishAuthReady;
    if (!ready) return;

    if (ready.mode === 'supabase') {
      state.mode = 'supabase';
      state.client = window.MASOFISH_AUTH.client;
      state.user = ready.session.user;
    } else {
      state.mode = 'prototype';
      state.user = {
        id: 'prototype-user',
        email: 'prototype@masofish.local',
        user_metadata: { full_name: 'Prototype Administrator' }
      };
    }

    state.role = await getRole();
    byId('addRecipeButton').hidden = state.role !== 'admin';

    const fishQuery = new URLSearchParams(location.search).get('fish');
    if (fishQuery) {
      state.search = fishQuery;
      byId('recipeSearchInput').value = fishQuery;
    }

    await loadData();
    render();
  }

  byId('recipeSearchInput').addEventListener('input', event => {
    state.search = event.target.value.trim();
    render();
  });
  byId('recipeSortSelect').addEventListener('change', event => {
    state.sort = event.target.value;
    render();
  });
  byId('recipeCategoryFilters').querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      state.category = button.dataset.category;
      byId('recipeCategoryFilters').querySelectorAll('[data-category]').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
      });
      render();
    });
  });

  byId('addRecipeButton').addEventListener('click', () => openAdmin());
  byId('closeRecipeDetailButton').addEventListener('click', () => closeModal(detailModal));
  byId('closeRecipeAdminButton').addEventListener('click', () => closeModal(adminModal));
  byId('cancelRecipeAdminButton').addEventListener('click', () => closeModal(adminModal));
  detailModal.addEventListener('click', event => { if (event.target === detailModal) closeModal(detailModal); });
  adminModal.addEventListener('click', event => { if (event.target === adminModal) closeModal(adminModal); });
  byId('recipeAdminForm').addEventListener('submit', saveRecipe);

  initialize().catch(error => {
    console.error(error);
    byId('recipeLoading').hidden = true;
    byId('recipeEmpty').hidden = false;
    byId('recipeStatus').textContent = error.message || 'Recipes could not be loaded.';
  });
})();