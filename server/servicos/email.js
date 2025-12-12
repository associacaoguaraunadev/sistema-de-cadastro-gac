/**
 * Serviço de Envio de Email - Brevo (ex-Sendinblue)
 */

let brevo = null;
let apiInstance = null;

try {
  /* Dynamic import so local dev without the package doesn't crash the server. */
  // eslint-disable-next-line no-undef
  brevo = await import('@getbrevo/brevo');
  apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
} catch (err) {
  console.warn('⚠️ Brevo client not available: emails will be logged instead.', err?.message || err);
  brevo = null;
  apiInstance = null;
}

export async function enviarEmailRecuperacao(email, token) {
  try {
    if (!process.env.BREVO_API_KEY || !brevo || !apiInstance) {
      console.warn('⚠️ BREVO_API_KEY não configurada ou cliente Brevo indisponível. Email não será enviado.');
      console.log(`📧 [DEV] Código de recuperação para ${email}: ${token}`);
      return { sucesso: false, motivo: 'API key não configurada ou cliente ausente' };
    }

    const SendSmtpEmail = brevo.SendSmtpEmail;
    if (!SendSmtpEmail) throw new Error('Brevo SDK: SendSmtpEmail não encontrado');

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = 'Código de Recuperação de Senha - GAC';
    sendSmtpEmail.to = [{ email, name: email.split('@')[0] }];
    sendSmtpEmail.htmlContent = `...`; // reduzido para brevidade

    sendSmtpEmail.sender = { name: process.env.EMAIL_FROM_NAME || 'GAC - Sistema de Gestão', email: process.env.EMAIL_FROM || 'noreply@gac-gestao.com' };
    const resultado = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = resultado?.body?.messageId || resultado?.messageId || 'sem ID';
    console.log(`✅ Email de recuperação enviado para ${email}`);
    return { sucesso: true, messageId, email };
  } catch (erro) {
    console.error('❌ Erro ao enviar email de recuperação:', erro.message);
    console.log(`📧 [FALLBACK] Código de recuperação para ${email}: ${token}`);
    throw new Error(`Falha ao enviar email: ${erro.message}`);
  }
}

export async function enviarEmailBoasVindas(email, nome) {
  try {
    if (!process.env.BREVO_API_KEY || !brevo || !apiInstance) {
      console.warn('⚠️ BREVO_API_KEY não configurada ou cliente Brevo indisponível. Email não será enviado.');
      console.log(`📧 [DEV] Boas-vindas para ${email}`);
      return { sucesso: false, motivo: 'API key não configurada ou cliente ausente' };
    }

    const SendSmtpEmail = brevo.SendSmtpEmail || brevo.SendTransacEmail;
    if (!SendSmtpEmail) throw new Error('Brevo SDK: SendSmtpEmail/SendTransacEmail não encontrado');

    const sendSmtpEmail = new SendSmtpEmail();
    // conteúdo reduzido
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email de boas-vindas enviado para ${email}`);
    return { sucesso: true, email };
  } catch (erro) {
    console.error('❌ Erro ao enviar email de boas-vindas:', erro);
    return { sucesso: false, erro: erro.message };
  }
}

export async function enviarEmailAceiteDigital(email, nome, codigo, link) {
  try {
    if (!process.env.BREVO_API_KEY || !brevo || !apiInstance) {
      console.warn('⚠️ BREVO_API_KEY não configurada ou cliente Brevo indisponível. Email de aceite não será enviado.');
      console.log(`📧 [DEV] Link de aceite para ${email}: ${link}`);
      return { sucesso: false, motivo: 'API key não configurada ou cliente ausente', link };
    }

    const SendSmtpEmail = brevo.SendSmtpEmail;
    if (!SendSmtpEmail) throw new Error('Brevo SDK: SendSmtpEmail não encontrado');

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = 'Aceite Digital de Matrícula - GAC';
    sendSmtpEmail.to = [{ email, name: nome || email.split('@')[0] }];
    sendSmtpEmail.htmlContent = `...`; // reduzido
    sendSmtpEmail.sender = { name: process.env.EMAIL_FROM_NAME || 'GAC - Sistema de Gestão', email: process.env.EMAIL_FROM || 'noreply@gac-gestao.com' };
    const resultado = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email de aceite enviado para ${email}.`);
    return { sucesso: true, email };
  } catch (erro) {
    console.error('❌ Erro ao enviar email de aceite:', erro.message);
    console.log(`📧 [FALLBACK] Link de aceite para ${email}: ${link}`);
    return { sucesso: false, erro: erro.message, link };
  }
}

export default { enviarEmailRecuperacao, enviarEmailBoasVindas, enviarEmailAceiteDigital };
