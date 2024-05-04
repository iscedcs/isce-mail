import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Section,
	Text,
} from '@react-email/components';
import * as React from 'react';

interface TwoFactorEmailTemplateProps {
	validationCode?: string;
	subject: string;
	template?: string;
	message?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const TwoFactorEmailTemplate = ({
	validationCode,
	subject,
	message,
	template,
}: TwoFactorEmailTemplateProps) => (
	<Html>
		<Head />
		<Body style={main}>
			<Container style={container}>
				<Img
					src={'https://www.striferral.com/logo.png'}
					width='100'
					height='100'
					alt='Striferral Logo'
					style={logo}
				/>
				<Text style={tertiary}>Two Factor Authentication</Text>
				<Heading style={secondary}>
					Enter the following code to complete your striferral
					sign in.
				</Heading>
				<Section style={codeContainer}>
					<Text style={code}>{validationCode}</Text>
				</Section>
				<Text style={paragraph}>Not expecting this email?</Text>
				<Text style={paragraph}>{subject}</Text>
				<Text style={paragraph}>{template}</Text>
				<Text style={paragraph}>{message}</Text>
				<Text style={paragraph}>
					Contact{' '}
					<Link
						href='mailto:support@striferral.com'
						style={link}
					>
						support@striferral.com
					</Link>{' '}
					if you did not request this code.
				</Text>
			</Container>
			<Text style={footer}>Securely powered by Striferral.</Text>
		</Body>
	</Html>
);

TwoFactorEmailTemplate.PreviewProps = {
	validationCode: '144833',
} as TwoFactorEmailTemplateProps;

export default TwoFactorEmailTemplate;

const main = {
	backgroundColor: '#ffffff',
	fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
};

const container = {
	backgroundColor: '#ffffff',
	border: '1px solid #eee',
	borderRadius: '5px',
	boxShadow: '0 5px 10px rgba(20,50,70,.2)',
	marginTop: '20px',
	maxWidth: '360px',
	margin: '0 auto',
	padding: '68px 0 130px',
};

const logo = {
	margin: '0 auto',
};

const tertiary = {
	color: '#f97316',
	fontSize: '11px',
	fontWeight: 700,
	fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
	height: '16px',
	letterSpacing: '0',
	lineHeight: '16px',
	margin: '16px 8px 8px 8px',
	textTransform: 'uppercase' as const,
	textAlign: 'center' as const,
};

const secondary = {
	color: '#000',
	display: 'inline-block',
	fontFamily: 'HelveticaNeue-Medium,Helvetica,Arial,sans-serif',
	fontSize: '20px',
	fontWeight: 500,
	lineHeight: '24px',
	marginBottom: '0',
	marginTop: '0',
	textAlign: 'center' as const,
};

const codeContainer = {
	background: 'rgba(0,0,0,.05)',
	borderRadius: '4px',
	margin: '16px auto 14px',
	verticalAlign: 'middle',
	width: '280px',
};

const code = {
	color: '#000',
	display: 'inline-block',
	fontFamily: 'HelveticaNeue-Bold',
	fontSize: '32px',
	fontWeight: 700,
	letterSpacing: '6px',
	lineHeight: '40px',
	paddingBottom: '8px',
	paddingTop: '8px',
	margin: '0 auto',
	width: '100%',
	textAlign: 'center' as const,
};

const paragraph = {
	color: '#444',
	fontSize: '15px',
	fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
	letterSpacing: '0',
	lineHeight: '23px',
	padding: '0 40px',
	margin: '0',
	textAlign: 'center' as const,
};

const link = {
	color: '#444',
	textDecoration: 'underline',
};

const footer = {
	color: '#000',
	fontSize: '12px',
	fontWeight: 800,
	letterSpacing: '0',
	lineHeight: '23px',
	margin: '0',
	marginTop: '20px',
	fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
	textAlign: 'center' as const,
	textTransform: 'uppercase' as const,
};
