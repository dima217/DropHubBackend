import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface PasswordChangeNotificationEmailProps {
  firstName: string;
  lastName: string;
  email: string;
}

export const PasswordChangeNotificationEmail = ({
  firstName,
  lastName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  email,
}: PasswordChangeNotificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>ConstructorMini - Password Successfully Changed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logoText}>ConstructorMini</Heading>
            <Text style={subtitle}>Создавайте мобильные приложения прямо с телефона</Text>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Здравствуйте, {firstName} {lastName}!
            </Text>

            <Section style={successBox}>
              <Text style={successTitle}>
                <strong>Ваш пароль успешно изменен</strong>
              </Text>
              <Text style={successText}>Пароль для вашего аккаунта был успешно изменен.</Text>
            </Section>

            <Text style={text}>
              Если это были вы, то можете проигнорировать это письмо. Ваш аккаунт в безопасности.
            </Text>
          </Section>

          <Section style={warningBox}>
            <Text style={warningTitle}>
              <strong>Важно:</strong>
            </Text>
            <Text style={warningText}>
              Если вы не изменяли пароль, пожалуйста, немедленно обратитесь в центр поддержки или
              смените пароль для защиты вашего аккаунта.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Это автоматическое сообщение, пожалуйста, не отвечайте на это письмо.
            </Text>
            <Text style={footerText}>
              Если у вас есть вопросы, пожалуйста, обратитесь в службу поддержки.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  backgroundColor: '#2c2c2c',
  padding: '20px',
};

const container = {
  backgroundColor: '#f5f5f5',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px',
  borderRadius: '16px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '40px',
};

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#000000',
  marginBottom: '8px',
  margin: '0',
};

const subtitle = {
  fontSize: '14px',
  color: '#666666',
  marginTop: '8px',
  margin: '0',
};

const content = {
  margin: '30px 0',
  color: '#000000',
};

const text = {
  marginBottom: '16px',
  fontSize: '16px',
  color: '#000000',
  margin: '0',
};

const successBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #000000',
  borderRadius: '12px',
  padding: '20px',
  margin: '24px 0',
};

const successTitle = {
  color: '#000000',
  display: 'block',
  marginBottom: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const successText = {
  color: '#000000',
  fontSize: '14px',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #000000',
  borderRadius: '12px',
  padding: '16px',
  margin: '24px 0',
};

const warningTitle = {
  color: '#000000',
  display: 'block',
  marginBottom: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const warningText = {
  color: '#000000',
  fontSize: '14px',
  margin: '0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '40px 0 0 0',
};

const footer = {
  marginTop: '40px',
  paddingTop: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#666666',
  fontSize: '12px',
  marginBottom: '8px',
  margin: '0 0 8px 0',
};

export default PasswordChangeNotificationEmail;
