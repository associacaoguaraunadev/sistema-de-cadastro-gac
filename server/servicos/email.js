// Este arquivo delega para a implementação canônica em `api/servicos/email.js`.
// Assim, qualquer import que aponte para `server/servicos/email.js` usa o mesmo template completo.
export * from '../../api/servicos/email.js';
export { default } from '../../api/servicos/email.js';
