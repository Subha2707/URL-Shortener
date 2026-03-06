function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Copied to clipboard!");
}