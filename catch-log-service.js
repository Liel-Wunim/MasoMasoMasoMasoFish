(function () {
  'use strict';

  const PROTOTYPE_KEY = 'masofishPrototypeCatchLogV1';
  const CATCH_BUCKET = 'catch-images';
  const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

  const state = {
    initialized: false,
    mode: null,
    client: null,
    user: null
  };

  function dataUrlToBlob(dataUrl) {
    const [header, body] = String(dataUrl).split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    const binary = atob(body || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function resizeImage(source, maxDimension = 1400, quality = 0.8) {
    let dataUrl;

    if (typeof source === 'string' && source.startsWith('data:')) {
      dataUrl = source;
    } else {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(source);
      });
    }

    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function seedPrototype() {
    const now = Date.now();
    return [
      {
        id: 'prototype-catch-1',
        user_id: 'prototype-user',
        fish_name: 'Rabbitfish',
        local_name: 'Danggit / Samaral',
        scientific_name: 'Siganus spp.',
        confidence_score: 0.94,
        freshness_score: 0.83,
        freshness_status: 'Likely Fresh',
        weight_kg: 1.2,
        length_cm: 34,
        catch_location: 'Northern Cebu coast',
        catch_date: new Date(now - 86400000).toISOString().slice(0, 10),
        catch_time: '06:20',
        disposition: 'harvested',
        notes: 'Caught near sunrise during calm conditions.',
        image_url: null,
        image_path: null,
        source: 'identification',
        created_at: new Date(now - 22 * 3600000).toISOString(),
        updated_at: new Date(now - 22 * 3600000).toISOString()
      },
      {
        id: 'prototype-catch-2',
        user_id: 'prototype-user',
        fish_name: 'Milkfish',
        local_name: 'Bangus',
        scientific_name: 'Chanos chanos',
        confidence_score: 0.91,
        freshness_score: 0.72,
        freshness_status: 'Mixed Freshness Indicators',
        weight_kg: 2.1,
        length_cm: 48,
        catch_location: 'Cebu coastal waters',
        catch_date: new Date(now - 3 * 86400000).toISOString().slice(0, 10),
        catch_time: '05:50',
        disposition: 'sold',
        notes: '',
        image_url: null,
        image_path: null,
        source: 'manual',
        created_at: new Date(now - 3 * 86400000).toISOString(),
        updated_at: new Date(now - 3 * 86400000).toISOString()
      }
    ];
  }

  function readPrototype() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROTOTYPE_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('Could not read prototype catch log:', error);
    }

    const seeded = seedPrototype();
    localStorage.setItem(PROTOTYPE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function writePrototype(items) {
    localStorage.setItem(PROTOTYPE_KEY, JSON.stringify(items));
  }

  async function initialize() {
    if (state.initialized) return state;
    const ready = await window.masofishAuthReady;
    if (!ready) throw new Error('Authentication is not available.');

    if (ready.mode === 'supabase') {
      state.mode = 'supabase';
      state.client = window.MASOFISH_AUTH.client;
      state.user = ready.session.user;
    } else {
      state.mode = 'prototype';
      state.user = {
        id: 'prototype-user',
        email: 'prototype@masofish.local',
        user_metadata: { full_name: 'Prototype User' }
      };
    }

    state.initialized = true;
    return state;
  }

  async function signedImageUrl(path) {
    if (!path || state.mode !== 'supabase') return null;
    const { data, error } = await state.client.storage
      .from(CATCH_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) {
      console.warn('Unable to create signed catch image URL:', error);
      return null;
    }
    return data?.signedUrl || null;
  }

  async function hydrateImages(items) {
    if (state.mode !== 'supabase') return items;
    return Promise.all(items.map(async item => ({
      ...item,
      display_image_url: item.image_path ? await signedImageUrl(item.image_path) : item.image_url
    })));
  }

  async function list(options = {}) {
    await initialize();
    const limit = Number.isFinite(options.limit) ? options.limit : 100;

    if (state.mode === 'prototype') {
      const items = readPrototype()
        .sort((a, b) => {
          const dateA = new Date(`${a.catch_date || '1970-01-01'}T${a.catch_time || '00:00'}`);
          const dateB = new Date(`${b.catch_date || '1970-01-01'}T${b.catch_time || '00:00'}`);
          return dateB - dateA;
        })
        .slice(0, limit);
      return items.map(item => ({ ...item, display_image_url: item.image_url || null }));
    }

    const { data, error } = await state.client
      .from('catch_logs')
      .select('*')
      .order('catch_date', { ascending: false })
      .order('catch_time', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return hydrateImages(data || []);
  }

  async function get(id) {
    await initialize();
    if (state.mode === 'prototype') {
      const item = readPrototype().find(entry => entry.id === id);
      return item ? { ...item, display_image_url: item.image_url || null } : null;
    }

    const { data, error } = await state.client
      .from('catch_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      display_image_url: data.image_path ? await signedImageUrl(data.image_path) : data.image_url
    };
  }

  async function uploadImage(source) {
    if (!source) return { image_path: null, image_url: null };
    await initialize();

    if (source instanceof File && source.size > MAX_IMAGE_BYTES) {
      throw new Error('The catch image is larger than 6 MB.');
    }

    const resizedDataUrl = await resizeImage(source);

    if (state.mode === 'prototype') {
      return { image_path: null, image_url: resizedDataUrl };
    }

    const blob = dataUrlToBlob(resizedDataUrl);
    const path = `${state.user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
    const { error } = await state.client.storage
      .from(CATCH_BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return { image_path: path, image_url: null };
  }

  function cleanPayload(input) {
    const numberOrNull = value => {
      const number = Number(value);
      return value === '' || value === null || value === undefined || !Number.isFinite(number)
        ? null
        : number;
    };

    return {
      fish_name: String(input.fish_name || '').trim(),
      local_name: String(input.local_name || '').trim() || null,
      scientific_name: String(input.scientific_name || '').trim() || null,
      confidence_score: numberOrNull(input.confidence_score),
      freshness_score: numberOrNull(input.freshness_score),
      freshness_status: String(input.freshness_status || '').trim() || null,
      weight_kg: numberOrNull(input.weight_kg),
      length_cm: numberOrNull(input.length_cm),
      catch_location: String(input.catch_location || '').trim() || null,
      catch_date: input.catch_date || new Date().toISOString().slice(0, 10),
      catch_time: input.catch_time || null,
      disposition: input.disposition || 'harvested',
      notes: String(input.notes || '').trim() || null,
      source: input.source || 'manual'
    };
  }

  async function create(input, imageSource = null) {
    await initialize();
    const payload = cleanPayload(input);
    if (!payload.fish_name) throw new Error('The fish or catch name is required.');

    const image = await uploadImage(imageSource);

    if (state.mode === 'prototype') {
      const item = {
        id: `prototype-catch-${crypto.randomUUID()}`,
        user_id: state.user.id,
        ...payload,
        ...image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const items = readPrototype();
      items.unshift(item);
      writePrototype(items);
      return { ...item, display_image_url: item.image_url };
    }

    const { data, error } = await state.client
      .from('catch_logs')
      .insert({
        user_id: state.user.id,
        ...payload,
        ...image
      })
      .select()
      .single();

    if (error) {
      if (image.image_path) {
        await state.client.storage.from(CATCH_BUCKET).remove([image.image_path]);
      }
      throw error;
    }

    return {
      ...data,
      display_image_url: data.image_path ? await signedImageUrl(data.image_path) : data.image_url
    };
  }

  async function update(id, input, imageSource = null) {
    await initialize();
    const payload = cleanPayload(input);
    const existing = await get(id);
    if (!existing) throw new Error('Catch record not found.');

    let image = {
      image_path: existing.image_path || null,
      image_url: existing.image_url || null
    };

    if (imageSource) {
      image = await uploadImage(imageSource);
    }

    if (state.mode === 'prototype') {
      const items = readPrototype();
      const index = items.findIndex(item => item.id === id);
      if (index < 0) throw new Error('Catch record not found.');
      items[index] = {
        ...items[index],
        ...payload,
        ...image,
        updated_at: new Date().toISOString()
      };
      writePrototype(items);
      return {
        ...items[index],
        display_image_url: items[index].image_url || null
      };
    }

    const { data, error } = await state.client
      .from('catch_logs')
      .update({ ...payload, ...image })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (imageSource && image.image_path) {
        await state.client.storage.from(CATCH_BUCKET).remove([image.image_path]);
      }
      throw error;
    }

    if (imageSource && existing.image_path && existing.image_path !== image.image_path) {
      await state.client.storage.from(CATCH_BUCKET).remove([existing.image_path]);
    }

    return {
      ...data,
      display_image_url: data.image_path ? await signedImageUrl(data.image_path) : data.image_url
    };
  }

  async function remove(id) {
    await initialize();
    const existing = await get(id);
    if (!existing) return false;

    if (state.mode === 'prototype') {
      writePrototype(readPrototype().filter(item => item.id !== id));
      return true;
    }

    const { error } = await state.client.from('catch_logs').delete().eq('id', id);
    if (error) throw error;

    if (existing.image_path) {
      const { error: storageError } = await state.client.storage
        .from(CATCH_BUCKET)
        .remove([existing.image_path]);
      if (storageError) console.warn('Catch deleted, but image cleanup failed:', storageError);
    }
    return true;
  }

  window.MASOFISH_CATCH_LOG = {
    initialize,
    state,
    list,
    get,
    create,
    update,
    remove,
    resizeImage
  };
})();