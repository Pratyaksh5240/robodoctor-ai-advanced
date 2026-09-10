export function dataUrlToInlineData(dataUrl: string) {
  const trimmed = (dataUrl || "").trim();
  const commaIdx = trimmed.indexOf(",");

  if (commaIdx !== -1) {
    const header = trimmed.slice(0, commaIdx);
    const dataPart = trimmed.slice(commaIdx + 1).replace(/\s+/g, "");
    const mimeMatch = header.match(/data:([^;]+)/i);
    const mimeType = mimeMatch ? mimeMatch[1].trim() : "application/octet-stream";
    return {
      mimeType,
      data: dataPart,
    };
  }

  // Raw base64 string without data: header
  return {
    mimeType: "application/octet-stream",
    data: trimmed.replace(/\s+/g, ""),
  };
}
