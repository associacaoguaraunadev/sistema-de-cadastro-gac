/**
 * Serviço de Envio de Email - Brevo (ex-Sendinblue)
 * 
 * Configuração:
 * 1. Crie conta em https://app.brevo.com
 * 2. Acesse Settings > SMTP & API > API Keys
 * 3. Crie uma API Key
 * 4. Adicione BREVO_API_KEY no .env
 */

import * as brevo from '@getbrevo/brevo';

// Configurar API do Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * Envia email de recuperação de senha
 * @param {string} email - Email do destinatário
 * @param {string} token - Código de recuperação (10 caracteres)
 * @returns {Promise<Object>} Resultado do envio
 */
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
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #2d5016 0%, #3a6b1d 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: bold;
            }
            .header p {
              margin: 10px 0 0;
              font-size: 16px;
              opacity: 0.9;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .code-container {
              background: #f8f9fa;
              border: 3px solid #2d5016;
              border-radius: 10px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #2d5016;
              font-family: 'Courier New', monospace;
              margin: 10px 0;
            }
            .code-label {
              font-size: 14px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .expiry {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .expiry strong {
              color: #856404;
            }
            .warning {
              background: #f8d7da;
              border-left: 4px solid #dc3545;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-icon {
              font-size: 20px;
              margin-right: 5px;
            }
            .footer {
              background: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
              border-top: 1px solid #e9ecef;
            }
            .footer p {
              margin: 5px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #2d5016;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 0;
                border-radius: 0;
              }
              .code {
                font-size: 28px;
                letter-spacing: 4px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GAC</h1>
              <p>Associação Guaraúna de Arte e Cultura</p>
            </div>
            
            <div class="content">
              <div class="greeting">Olá!</div>
              
              <p>Você solicitou a recuperação de senha para sua conta no sistema de gestão GAC.</p>
              
              <p>Use o código abaixo para continuar o processo de redefinição:</p>
              
              <div class="code-container">
                <div class="code-label">Seu Código de Recuperação</div>
                <div class="code">${token}</div>
              </div>
              
              <div class="expiry">
                <strong>⏰ Atenção:</strong> Este código expira em <strong>30 minutos</strong>.
              </div>
              
              <p>Se você não solicitou esta recuperação, ignore este email. Sua senha permanecerá inalterada e sua conta estará segura.</p>
              
              <div class="warning">
                <span class="warning-icon">🔒</span>
                <strong>Segurança:</strong> Nunca compartilhe este código com ninguém. Nossa equipe nunca pedirá seu código por telefone ou email.
              </div>
            </div>
            
            <div class="footer">
              <p><strong>© ${new Date().getFullYear()} GAC - Associação Guaraúna de Arte e Cultura</strong></p>
              <p>Este é um email automático, não responda a esta mensagem.</p>
              <p style="margin-top: 15px; font-size: 12px; color: #999;">
                Se precisar de ajuda, entre em contato conosco.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Configurar remetente
    sendSmtpEmail.sender = {
      name: process.env.EMAIL_FROM_NAME || 'GAC - Sistema de Gestão',
      email: process.env.EMAIL_FROM || 'noreply@gac-gestao.com'
    };

    // Enviar email
    const resultado = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log(`✅ Email de recuperação enviado para ${email}`);
    console.log(`   Message ID: ${resultado.messageId}`);

    return {
      sucesso: true,
      messageId: resultado.messageId,
      email
    };

  } catch (erro) {
    console.error('❌ Erro ao enviar email de recuperação:', erro);
    
    // Em caso de erro, ainda logar o código para debug
    console.log(`📧 [FALLBACK] Código de recuperação para ${email}: ${token}`);
    
    throw new Error(`Falha ao enviar email: ${erro.message}`);
  }
}

/**
 * Envia email de boas-vindas (novo usuário)
 * @param {string} email - Email do novo usuário
 * @param {string} nome - Nome do usuário
 * @returns {Promise<Object>} Resultado do envio
 */
export async function enviarEmailBoasVindas(email, nome) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY não configurada.');
      return { sucesso: false, motivo: 'API key não configurada' };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = 'Bem-vindo ao GAC!';
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2d5016; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo, ${nome}!</h1>
            </div>
            <div class="content">
              <p>Sua conta foi criada com sucesso no sistema de gestão GAC.</p>
              <p>Agora você pode acessar todas as funcionalidades do sistema.</p>
              <p><strong>Associação Guaraúna de Arte e Cultura</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;

    sendSmtpEmail.sender = {
      name: process.env.EMAIL_FROM_NAME || 'GAC - Sistema de Gestão',
      email: process.env.EMAIL_FROM || 'noreply@gac-gestao.com'
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email de boas-vindas enviado para ${email}`);

    return { sucesso: true, email };
  } catch (erro) {
    console.error('❌ Erro ao enviar email de boas-vindas:', erro);
    return { sucesso: false, erro: erro.message };
  }
}

export default {
  enviarEmailRecuperacao,
  enviarEmailBoasVindas
};
