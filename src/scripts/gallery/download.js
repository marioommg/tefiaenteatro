export async function downloadAsJPG(webpUrl, filename, button) {
  if (!webpUrl) {
    return;
  }

  const targetButton = button ?? null;
  const originalHTML = targetButton ? targetButton.innerHTML : '';

  try {
    if (targetButton) {
      targetButton.disabled = true;
      targetButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" class="spinner"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"></circle><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"></path></svg>';
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = webpUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto 2D');
    }

    ctx.drawImage(img, 0, 0);

    // Removed TS generic from Promise for browser runtime compatibility
    const blob = await new Promise((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.95)
    );

    if (!blob) {
      throw new Error('No se pudo convertir la imagen');
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.replace(/\.webp$/i, '.jpg');
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al convertir la imagen:', error);
    window.open(webpUrl, '_blank');
  } finally {
    if (targetButton) {
      targetButton.disabled = false;
      targetButton.innerHTML = originalHTML;
    }
  }
}
