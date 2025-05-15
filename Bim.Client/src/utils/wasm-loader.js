export async function initializeWasm() {
  if (!WebAssembly.instantiateStreaming) {
    WebAssembly.instantiateStreaming = async (response, imports) => {
      const buffer = await response.arrayBuffer();
      return WebAssembly.instantiate(buffer, imports);
    };
  }
}

// Call this at app startup
initializeWasm();
