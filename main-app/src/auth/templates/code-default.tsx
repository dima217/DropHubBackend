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

interface CodeDefaultEmailProps {
  code: string;
  expirationMinutes: number;
  expirationDate: string;
}

export const CodeDefaultEmail = ({
  code,
  expirationMinutes,
  expirationDate,
}: CodeDefaultEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verification Code</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logoText}>ConstructorMini</Heading>
            <Text style={subtitle}>Создавайте мобильные приложения прямо с телефона</Text>
          </Section>

          <Section style={content}>
            <Text style={text}>Пожалуйста, используйте код подтверждения ниже:</Text>

            <Section style={codeBox}>
              <Text style={codeHint}>Your verification code:</Text>
              <Text id="verification-code">{code}</Text>
              <Text style={copyHint}>Tap the code above to select and copy it</Text>
            </Section>
            <Section style={codePlain}>
              <Text style={codePlainHint}>Or copy from here:</Text>
              <Text style={codeText}>{code}</Text>
            </Section>

            <Section style={infoBox}>
              <Text style={infoTitle}>
                <strong>Примечание:</strong>
              </Text>
              <Text style={infoText}>
                Этот код действителен в течение {expirationMinutes} минут ({expirationDate}).
              </Text>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Это автоматическое сообщение, пожалуйста, не отвечайте на это письмо.
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

const codeBox = {
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  borderRadius: '12px',
  padding: '32px 20px',
  textAlign: 'center' as const,
  margin: '32px 0',
  cursor: 'pointer',
  userSelect: 'all' as const,
  WebkitUserSelect: 'all' as const,
};

const codeHint = {
  fontSize: '14px',
  color: '#666666',
  marginBottom: '12px',
  margin: '0 0 12px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const code = {
  fontSize: '42px',
  fontWeight: 'bold',
  color: '#000000',
  letterSpacing: '12px',
  fontFamily: "'Courier New', monospace",
  margin: '12px 0',
  userSelect: 'all' as const,
  WebkitUserSelect: 'all' as const,
  cursor: 'text',
  display: 'block',
  padding: '16px',
  backgroundColor: '#f8f8f8',
  borderRadius: '4px',
  border: '1px solid #e0e0e0',
  whiteSpace: 'pre' as const,
  overflowX: 'auto' as const,
};

const copyHint = {
  fontSize: '12px',
  color: '#999999',
  marginTop: '8px',
  margin: '8px 0 0 0',
  fontStyle: 'italic',
};

const codePlain = {
  margin: '20px 0',
  padding: '16px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
};

const codePlainHint = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  color: '#666666',
  fontWeight: '600',
};

const codeText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#000000',
  letterSpacing: '8px',
  fontFamily: "'Courier New', monospace",
  margin: '12px 0 0 0',
  padding: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid #000000',
  borderRadius: '4px',
  textAlign: 'center' as const,
  userSelect: 'all' as const,
  WebkitUserSelect: 'all' as const,
  cursor: 'text',
  overflowX: 'auto' as const,
};

const infoBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
  borderLeft: '4px solid #000000',
  borderRadius: '12px',
  padding: '16px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#000000',
  display: 'block',
  marginBottom: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const infoText = {
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

export default CodeDefaultEmail;
