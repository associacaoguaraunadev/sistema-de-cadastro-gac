import nodemailer from 'nodemailer';

// Configuração do transporte de email
let transporter;

// Criar transporter baseado no ambiente
if (process.env.NODE_ENV === 'production') {
  // Produção: usar variáveis de ambiente
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  // Desenvolvimento: usar Ethereal (serviço de teste gratuito)
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_EMAIL || 'user@ethereal.email',
      pass: process.env.ETHEREAL_PASSWORD || 'password'
    }
  });
}

export async function enviarEmailRecuperacaoSenha(email, nome, tokenRecuperacao, linkRecuperacao) {
  const assunto = '🔐 Recupere sua senha - Sistema GAC';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .button:hover { background: #1b5e20; }
        .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Recuperação de Senha</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <p>Recebemos uma solicitação para recuperar sua senha no Sistema GAC. Se não foi você, ignore este email.</p>
          
          <p>Para criar uma nova senha, clique no botão abaixo:</p>
          
          <center>
            <a href="${linkRecuperacao}" class="button">Recuperar Senha</a>
          </center>
          
          <div class="warning">
            <strong>⏱️ Importante:</strong> Este link expira em <strong>1 hora</strong>. Se expirar, você precisará solicitar outro.
          </div>
          
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
            ${linkRecuperacao}
          </p>
          
          <p><strong>Dúvidas?</strong> Entre em contato com o suporte.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda a este endereço.</p>
          <p>© ${new Date().getFullYear()} Sistema GAC - Associação Guaraúna Dev</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@sistemagac.com.br',
      to: email,
      subject: assunto,
      html
    });
    
    console.log(`✅ Email de recuperação enviado para ${email}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return true;
  } catch (erro) {
    console.error(`❌ Erro ao enviar email: ${erro.message}`);
    throw erro;
  }
}

export async function enviarEmailConfirmacaoResetado(email, nome) {
  const assunto = '✅ Sua senha foi redefinida - Sistema GAC';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724; }
        .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Senha Redefinida com Sucesso</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <div class="success">
            <strong>Sua senha foi redefinida com sucesso!</strong> Você já pode fazer login com sua nova senha.
          </div>
          
          <p>Se você não fez esta alteração, mude sua senha imediatamente e entre em contato com o suporte.</p>
          
          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>Faça login com sua nova senha</li>
            <li>Guarde sua senha em um local seguro</li>
            <li>Nunca compartilhe sua senha com ninguém</li>
          </ul>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda a este endereço.</p>
          <p>© ${new Date().getFullYear()} Sistema GAC - Associação Guaraúna Dev</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@sistemagac.com.br',
      to: email,
      subject: assunto,
      html
    });
    
    console.log(`✅ Email de confirmação enviado para ${email}`);
    return true;
  } catch (erro) {
    console.error(`❌ Erro ao enviar email de confirmação: ${erro.message}`);
    throw erro;
  }
}
