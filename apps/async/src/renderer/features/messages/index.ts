// The only barrel of the feature. It states the public API and nothing else: inside the feature
// every module imports the file that defines the symbol.

export { messagesStore } from './messages-store.js';
export { registerMessageSchemas } from './lib/register-message-schemas.js';
export { MessageItemKind } from './MessageItemKind.js';
