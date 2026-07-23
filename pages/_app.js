import Head from "next/head";
import { AuthProvider } from "../components/AuthProvider";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>Onboarding+ | 新入社員オンボーディング管理</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
