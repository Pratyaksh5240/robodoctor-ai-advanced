export function dataUrlToInlineData(dataUrl: string) {
  const match = dataUrl.trim().match(/^data:(.+?);base64,(.+)$/);

  if (!match) {
    throw new Error("Uploaded file must be provided as a base64 data URL.");
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}
