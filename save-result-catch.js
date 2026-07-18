(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const modal = byId('saveCatchResultModal');
  const service = window.MASOFISH_CATCH_LOG;

  function openModal() {
    const prediction = JSON.parse(sessionStorage.getItem('masofishPrediction') || 'null');
    const freshness = JSON.parse(sessionStorage.getItem('masofishFreshness') || 'null');
    if (!prediction) return;

    byId('saveCatchFishName').value = prediction.className || '';
    byId('saveCatchLocalName').value = byId('localName')?.textContent || '';
    byId('saveCatchScientificName').value = byId('scientificName')?.textContent || '';
    byId('saveCatchDate').value = new Date().toISOString().slice(0, 10);
    byId('saveCatchTime').value = new Date().toTimeString().slice(0, 5);
    byId('saveCatchConfidence').textContent = Number.isFinite(Number(prediction.probability))
      ? `${Math.round(Number(prediction.probability) * 100)}%`
      : '—';
    byId('saveCatchFreshness').textContent = freshness?.hasValidSample
      ? `${freshness.overallPercent}% — ${freshness.status}`
      : 'Unavailable';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function showMessage(text, type = 'error') {
    const box = byId('saveCatchResultMessage');
    box.hidden = false;
    box.className = 'rounded-xl border p-3 text-sm';
    if (type === 'success') box.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
    else box.classList.add('bg-red-50', 'border-red-200', 'text-red-900');
    box.textContent = text;
  }

  byId('saveToCatchLogButton').addEventListener('click', openModal);
  byId('closeSaveCatchModalButton').addEventListener('click', closeModal);
  byId('cancelSaveCatchButton').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

  byId('saveCatchResultForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = byId('confirmSaveCatchButton');
    submit.disabled = true;
    submit.textContent = 'Saving…';

    try {
      const prediction = JSON.parse(sessionStorage.getItem('masofishPrediction') || 'null');
      const freshness = JSON.parse(sessionStorage.getItem('masofishFreshness') || 'null');
      const image = sessionStorage.getItem('masofishImage');

      await service.create({
        fish_name: byId('saveCatchFishName').value,
        local_name: byId('saveCatchLocalName').value,
        scientific_name: byId('saveCatchScientificName').value,
        confidence_score: prediction?.probability ?? null,
        freshness_score: freshness?.hasValidSample ? freshness.overallScore : null,
        freshness_status: freshness?.hasValidSample ? freshness.status : null,
        weight_kg: byId('saveCatchWeight').value,
        length_cm: byId('saveCatchLength').value,
        catch_location: byId('saveCatchLocation').value,
        catch_date: byId('saveCatchDate').value,
        catch_time: byId('saveCatchTime').value,
        disposition: byId('saveCatchDisposition').value,
        notes: byId('saveCatchNotes').value,
        source: 'identification'
      }, image);

      sessionStorage.setItem('masofishLastSavedIdentification', prediction?.identifiedAt || new Date().toISOString());
      byId('saveToCatchLogButton').innerHTML =
        '<span class="material-symbols-outlined">check_circle</span>Saved to Catch Log';
      byId('saveToCatchLogButton').disabled = true;
      showMessage('Catch saved successfully.', 'success');
      setTimeout(closeModal, 900);
    } catch (error) {
      showMessage(error.message || 'The catch could not be saved.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Save Catch';
    }
  });

  const prediction = JSON.parse(sessionStorage.getItem('masofishPrediction') || 'null');
  if (
    prediction?.identifiedAt &&
    sessionStorage.getItem('masofishLastSavedIdentification') === prediction.identifiedAt
  ) {
    byId('saveToCatchLogButton').innerHTML =
      '<span class="material-symbols-outlined">check_circle</span>Saved to Catch Log';
    byId('saveToCatchLogButton').disabled = true;
  }
})();