/**
 * Serviço de Envio de Email - Brevo (ex-Sendinblue)
 */

import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

export async function enviarEmailRecuperacao(email, token) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY não configurada. Email não será enviado.');
      console.log(`📧 [DEV] Código de recuperação para ${email}: ${token}`);
      return { sucesso: false, motivo: 'API key não configurada' };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
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
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY não configurada.');
      return { sucesso: false, motivo: 'API key não configurada' };
    }
    const sendSmtpEmail = new brevo.SendTransacEmail();
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
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY não configurada. Email de aceite não será enviado.');
      console.log(`📧 [DEV] Link de aceite para ${email}: ${link}`);
      return { sucesso: false, motivo: 'API key não configurada', link };
    }
    const sendSmtpEmail = new brevo.SendSmtpEmail();
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
