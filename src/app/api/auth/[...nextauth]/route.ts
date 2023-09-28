import { Theme } from "@excalidraw/excalidraw/types/element/types";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import mjml2html from "mjml";
import { DefaultSession, NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import EmailProvider from "next-auth/providers/email";
import nodemailer from 'nodemailer'
import jwt, { Secret } from "jsonwebtoken";

const prisma = new PrismaClient();
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      userName: string;
      role: string[];
      id: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    idToken?: string;
    role: string[];
  }
}


function confirmPasswordHash(plainPassword: any, hashedPassword: any) {
  return new Promise((resolve) => {
    bcrypt.compare(plainPassword, hashedPassword, function (err, res) {
      resolve(res);
    });
  });
}

export const nextAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          
          let user = null

          if (credentials?.username?.includes('@')) {
            user = await prisma.user.findFirst({
              where: {
                email: credentials?.username,
                isActive: true
              },
            });
          } else {
            user = await prisma.user.findFirst({
              where: {
                userName: credentials?.username,
                isActive: true
              },
            });
          }

          if (user !== null) {
            const res = await confirmPasswordHash(
              credentials?.password,
              user.password
            );
            if (res === true) {
              const userAccount = {
                id: Number(user.id),
                name: user.userName,
                userName: user.userName,
                email: user.email,
                role: user.role,
              };
              return userAccount;
            } else {
              console.log("Hash not matched logging in");
              return null;
            }
          } else {
            return null;
          }
        } catch (err) {
          console.log("Authentication error:", err);
          return null;
        }
      },
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({
        identifier: email,
        url,
        token,
        provider: { server, from },
      }) {
        const urlParams = new URLSearchParams(url);
        const redirectUrl = urlParams.get(`${process.env.NEXTAUTH_URL}/api/auth/callback/email?callbackUrl`)
        let loginMail = true
        if (redirectUrl != '/') {
          loginMail = false
        }
        const { host } = new URL(url);
        const transport = nodemailer.createTransport(server);
        await transport.sendMail({
          to: email,
          from,
          subject: loginMail ? `Sign in to ${host}` : 'Email Confirmation',
          text: text({ url, host, loginMail }),
          html: mjHtml({ url, host, loginMail } as any),
        });
      },
    }),

  ],
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }: any) {
      // Persist the OAuth access_token to the token right after signin
      // if (account) {
      //   token.accessToken = account.access_token;
      // }
      if (user) {
        token.role = [user.role] as string[];
        token.name = user.userName as any;
        token.id = Number(user.id);
      }
      // console.log("------jwt-token--->", token);
      return token;
    },
    async session({ session, user, token }: any) {
      // Send properties to the client, like an access_token from a provider.
      // session.accessToken = token.accessToken;

      const encodedToken: any = jwt.sign(
        token,
        process.env.NEXTAUTH_SECRET as Secret
      );
      session.jwt = encodedToken;
      session.user.role = token.role;
      session.user.id = token.id as number;
      session.accessToken = token.accessToken
      return session;
    },
    async signIn({ user, account, profile, email, credentials }: any) {
      if (email?.verificationRequest) {
        const allowed = user.userName && user.isActive == true ? true : "${url}/error?error=CredentialsSignin"
        return allowed
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      return url
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify'
  }
}



function mjHtml(params: { url: string; host: string; theme: Theme; loginMail: boolean }) {

  return (
    mjml2html(`
    <mjml>
  <mj-head>
    <mj-title>Discount Light</mj-title>
    <mj-preview>Pre-header Text</mj-preview>
    <mj-attributes>
      <mj-all font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"></mj-all>
      <mj-text font-weight="400" font-size="16px" color="#000000" line-height="24px" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"></mj-text>
    </mj-attributes>
    <mj-style inline="inline">
      .body-section {
      background-color:#ffffff;
      -webkit-box-shadow: 1px 4px 11px 0px rgba(0, 0, 0, 0.15);
      -moz-box-shadow: 1px 4px 11px 0px rgba(0, 0, 0, 0.15);
      box-shadow: 1px 4px 11px 0px rgba(0, 0, 0, 0.15);
      }
    </mj-style>
    <mj-style inline="inline">
      .text-link {
      color: #5e6ebf
      }
    </mj-style>
    <mj-style inline="inline">
      .footer-link {
      color: #888888
      }
    </mj-style>

  </mj-head>
  <mj-body  background-color="#E7E7E7" width="600px" >
    <mj-section padding-top='142px'>
    </mj-section>
    <mj-wrapper padding="0 20px" css-class='body-section' >
      <mj-section>
      	<mj-column>
        ${loginMail
        ? `<mj-image alt="Logo" src='${process.env.NEXTAUTH_URL}/assets/images/signin-email.png'  width="80px" align="center" ></mj-image>`
        : `<mj-image alt="Logo" src='${process.env.NEXTAUTH_URL}/assets/images/emailverify-email.png'  width="80px" align="center" ></mj-image>`
      } 
        <mj-text color="#64748B"  align='center' font-weight="400" font-size="24px" padding-top='12px' padding-bottom="24px" 
                 line-height='20px'>
          ${loginMail ? 'Sign in using the link' : 'Email verification'}
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#FAFAFA" padding="0px" >
      <mj-column padding-bottom="50px" >
        <mj-text color='#475569' >
         Hi User,
        </mj-text>
        <mj-text color='#475569'>
         ${loginMail ? 'Please click on the link below to sign in :' :
        'Thanks for joining! Please click on the link below to verify your email'}
        </mj-text>
        <mj-text color="#637381" font-size="16px">
          <a href="${url}" target="_blank">
          	${loginMail ? `Sign in` : `Verify Email`}
          </a>
        </mj-text>
        <mj-text color='#475569'>
          This link will only be valid for 24 hours & one time usable.
        </mj-text>
        <mj-text color="#637381" font-size="16px">
           Regards
          <br />
          ${process.env.NEXT_PUBLIC_SCHOOL_NAME}
          </mj-text>
      </mj-column>
   	</mj-section>
   </mj-wrapper>
    <mj-wrapper full-width="full-width">
      <mj-section padding-top="0">
        <mj-group>
          <mj-column width="100%" padding-right="0">
            <mj-text color="#445566" font-size="11px" align="center" line-height="16px" font-weight="bold">
               Powered by Tutorcomp  
            </mj-text>
          </mj-column>
        </mj-group>

      </mj-section>
    </mj-wrapper>
    <mj-section padding-bottom='142px'>
    </mj-section>
  </mj-body>
</mjml>
        `)
  ).html
}

/** Email Text body (fallback for email clients that don't render HTML, e.g. feature phones) */
function text({ url, host, loginMail }: { url: string; host: string; loginMail: boolean }) {
  return loginMail ? `Sign in to ${host}\n${url}\n\n` : `Verify Email ${host}\n${url}\n\n`
}

const handler = NextAuth(nextAuthOptions);

export { handler as GET, handler as POST };