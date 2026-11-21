import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n";
import { FEEDBACK_FORM_URL } from "./Footer";
import { TermsSection } from "./TermsOfService";

const ISSUES_URL = "https://github.com/ut-code/henkanhakase/issues";

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const { locale } = useTranslation();

  if (locale === "en") {
    return <EnglishPrivacyPolicy onBack={onBack} />;
  }

  return (
    <PolicyLayout
      lang="ja"
      title="変換はかせ プライバシーポリシー"
      backLabel="変換はかせに戻る"
      onBack={onBack}
    >
      <p className="mb-8 text-right text-xs text-[#8e9aab]">
        制定日：2026年11月21日
      </p>

      <p className="mb-8 leading-8">
        ut.code();（以下「運営者」といいます。）は、「変換はかせ」の名称で提供するサービス（以下「本サービス」といいます。）及び本サービスを構成するソフトウェア（ブラウザ版及びデスクトップアプリケーションを含みます。以下「本ソフトウェア」といいます。）における、本サービスをご利用いただくお客様（以下「ユーザー」といいます。）の情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。本ポリシーで定義されていない用語は、変換はかせ利用規約の定義に従います。
      </p>

      <TermsSection title="第1条（基本方針）">
        <p>
          本ソフトウェアは、ユーザーのファイルをユーザー自身の端末内のみで変換することを基本設計としています。運営者は、本ソフトウェアの利用を通じてユーザーの個人情報を取得しません（第8条に定めるお問い合わせの場合を除きます。）。
        </p>
      </TermsSection>

      <TermsSection title="第2条（取得しない情報）">
        <p>
          本ソフトウェアは、それ自体の機能として、次の情報を取得、収集又は外部へ送信しません（Microsoft
          Store
          等の配信サービスの提供者が収集する情報については、第7条をご参照ください。）。
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>氏名、メールアドレス、電話番号その他の個人を識別できる情報</li>
          <li>
            ユーザーが本ソフトウェアで読み込み、又は変換したファイルの内容及びファイル名
          </li>
          <li>利用履歴、操作ログ及びアクセス解析情報</li>
          <li>端末の識別子、広告識別子及び位置情報</li>
          <li>クラッシュレポート及び診断データ</li>
        </ol>
        <p>
          本ソフトウェアには、会員登録やログインの機能、広告、アクセス解析ツール及びトラッキング技術は含まれていません。
        </p>
      </TermsSection>

      <TermsSection title="第3条（ファイルの取り扱い）">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            ユーザーが本ソフトウェアに読み込んだファイルは、ユーザーの端末内でのみ処理され、運営者又は第三者のサーバーへ送信されることはありません。ブラウザ版においても、変換処理はブラウザ内で行われます。
          </li>
          <li>
            デスクトップアプリケーションでは、変換処理の過程で端末の一時フォルダ内に一時ファイルが作成されることがあります。一時ファイルは、変換処理の完了後、アプリケーションの終了時又は次回起動時に自動的に削除されます。
          </li>
          <li>
            変換後のファイルは、ユーザーが指定した保存先にのみ保存されます。
          </li>
          <li>
            変換後のファイルには、元のファイルに含まれていたメタデータ（撮影日時、位置情報、作成者情報等）が引き継がれる場合があります。変換後のファイルを第三者と共有する際は、必要に応じて内容をご確認ください。
          </li>
        </ol>
      </TermsSection>

      <TermsSection title="第4条（端末内に保存される情報）">
        <p>
          本ソフトウェアは、ユーザーが選択した表示言語の設定を、ユーザーの端末内（ブラウザ版ではブラウザのローカルストレージ）に保存します。この情報が外部へ送信されることはありません。この情報は、ブラウザのサイトデータ又はアプリケーションのデータを削除することで消去できます。
        </p>
      </TermsSection>

      <TermsSection title="第5条（ブラウザ版の配信）">
        <p>
          ブラウザ版の配信にあたり、配信に利用するホスティング事業者のサーバーが、IPアドレス、ブラウザの種類、アクセス日時等のアクセスログを記録する場合があります。これらはウェブページの配信及び安全な運用のために用いられるものであり、運営者がこれらの情報を用いてユーザーを特定することはありません。
        </p>
      </TermsSection>

      <TermsSection title="第6条（外部サービス）">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            本ソフトウェアには、運営者のウェブサイト、GitHub、X（旧Twitter）、Googleフォーム等の外部サービスへのリンクが含まれています。デスクトップアプリケーションでは、リンクは端末の既定のウェブブラウザで開きます。
          </li>
          <li>
            外部サービスにおける情報の取り扱いについては、各サービスのプライバシーポリシーをご確認ください。
          </li>
        </ol>
      </TermsSection>

      <TermsSection title="第7条（Microsoft Store 等の配信サービス）">
        <p>
          デスクトップアプリケーションを Microsoft Store
          その他の配信サービスから入手した場合、ダウンロード、インストール等に関する情報は、各配信サービスの提供者がそのプライバシーポリシーに従って取り扱います。また、Windows
          等のオペレーティングシステムが、その機能としてアプリケーションのクラッシュ等に関する情報を収集する場合があります。運営者は、これらの提供者が集計したダウンロード数、クラッシュ件数等の統計情報を、開発者向けの管理画面（Microsoft
          Partner Center
          等）を通じて閲覧することがありますが、これらは個人を特定できない形式で提供されるものであり、本サービスの品質改善の目的にのみ利用します。
        </p>
      </TermsSection>

      <TermsSection title="第8条（お問い合わせ時の情報）">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            ユーザーがフィードバックフォーム又は GitHub
            を通じて運営者に問い合わせを行った場合、運営者は、問い合わせに記載された情報を、問い合わせへの対応及び本サービスの改善の目的にのみ利用し、法令に基づく場合を除き第三者に提供しません。
          </li>
          <li>
            GitHub の Issue
            は誰でも閲覧できるため、個人情報を記載しないようご注意ください。
          </li>
        </ol>
      </TermsSection>

      <TermsSection title="第9条（本ポリシーの変更）">
        <p>
          運営者は、本サービスの機能の変更や法令の改正等に応じて、本ポリシーを変更することがあります。本ソフトウェアが新たにユーザーの情報を取得するようになる場合は、事前に本ポリシーを改定し、本サービス上で告知します。
        </p>
      </TermsSection>

      <TermsSection title="第10条（お問い合わせ窓口）">
        <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>運営者：ut.code();</li>
          <li>
            <ExternalLink href={FEEDBACK_FORM_URL}>
              フィードバックフォーム
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href={ISSUES_URL}>GitHub Issues</ExternalLink>
          </li>
        </ul>
      </TermsSection>

      <p className="mt-8 text-right text-xs text-[#8e9aab]">以上</p>
    </PolicyLayout>
  );
}

function EnglishPrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <PolicyLayout
      lang="en"
      title="Henkan Hakase Privacy Policy"
      backLabel="Back to Henkan Hakase"
      onBack={onBack}
    >
      <p className="mb-8 text-right text-xs text-[#8e9aab]">
        Effective date: November 21, 2026
      </p>

      <p className="mb-8 leading-8">
        This Privacy Policy (the &quot;Policy&quot;) explains how ut.code();
        (the &quot;Operator&quot;) handles information of customers (the
        &quot;Users&quot;) who use the service provided under the name
        &quot;Henkan Hakase&quot; (the &quot;Service&quot;) and the software
        that makes up the Service, including the browser version and the desktop
        applications (the &quot;Software&quot;). Terms not defined in this
        Policy have the meanings given in the Henkan Hakase Terms of Service.
      </p>

      <TermsSection title="Article 1 (Our Approach)">
        <p>
          The Software is designed to convert files entirely on the User&apos;s
          own device. The Operator does not collect any personal information
          through the use of the Software, except in the case of inquiries as
          described in Article 8.
        </p>
      </TermsSection>

      <TermsSection title="Article 2 (Information We Do Not Collect)">
        <p>
          The Software itself does not collect, store, or transmit the following
          information. For information collected by the providers of
          distribution services such as the Microsoft Store, see Article 7.
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            Names, email addresses, phone numbers, or other information that
            identifies an individual
          </li>
          <li>
            The contents or names of files opened or converted with the Software
          </li>
          <li>Usage history, activity logs, or analytics data</li>
          <li>Device identifiers, advertising identifiers, or location data</li>
          <li>Crash reports or diagnostic data</li>
        </ol>
        <p>
          The Software has no account or sign-in features, no advertising, and
          no analytics or tracking technologies.
        </p>
      </TermsSection>

      <TermsSection title="Article 3 (Handling of Files)">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            Files opened in the Software are processed only on the User&apos;s
            device and are never sent to the Operator&apos;s servers or to any
            third party. In the browser version, conversion also takes place
            within the browser.
          </li>
          <li>
            In the desktop applications, temporary files may be created in the
            system&apos;s temporary folder during conversion. They are deleted
            automatically when the conversion finishes, when the application
            closes, or the next time it starts.
          </li>
          <li>
            Converted files are saved only to the location the User chooses.
          </li>
          <li>
            Converted files may keep metadata from the original file (such as
            capture date, location, or author information). Please check files
            before sharing them with others if necessary.
          </li>
        </ol>
      </TermsSection>

      <TermsSection title="Article 4 (Information Stored on the Device)">
        <p>
          The Software stores the User&apos;s display language preference on the
          device (in the browser version, in the browser&apos;s local storage).
          It is never transmitted. It can be removed by deleting the
          browser&apos;s site data or the application&apos;s data.
        </p>
      </TermsSection>

      <TermsSection title="Article 5 (Delivery of the Browser Version)">
        <p>
          When delivering the browser version, the servers of the hosting
          provider may record access logs such as IP addresses, browser types,
          and access times. These logs are used to deliver and securely operate
          the web pages, and the Operator does not use them to identify Users.
        </p>
      </TermsSection>

      <TermsSection title="Article 6 (External Services)">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            The Software contains links to external services, such as the
            Operator&apos;s website, GitHub, X (formerly Twitter), and Google
            Forms. In the desktop applications, links open in the default web
            browser.
          </li>
          <li>
            Please refer to each service&apos;s privacy policy for how it
            handles information.
          </li>
        </ol>
      </TermsSection>

      <TermsSection title="Article 7 (Microsoft Store and Other Distribution Services)">
        <p>
          If a User obtains a desktop application from the Microsoft Store or
          another distribution service, information related to downloads and
          installation is handled by the provider of that service under its
          privacy policy. In addition, operating systems such as Windows may
          collect information about application crashes and similar events as
          part of their own functionality. The Operator may view aggregated
          statistics compiled by these providers, such as download counts and
          crash counts, through developer dashboards such as Microsoft Partner
          Center. These statistics are provided in a form that does not identify
          individuals, and the Operator uses them only to improve the Service.
        </p>
      </TermsSection>

      <TermsSection title="Article 8 (Inquiries)">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            If a User contacts the Operator through the feedback form or GitHub,
            the Operator uses the information provided only to respond to the
            inquiry and to improve the Service, and does not share it with third
            parties unless required by law.
          </li>
          <li>
            GitHub Issues are public, so please do not include personal
            information in them.
          </li>
        </ol>
      </TermsSection>

      <TermsSection title="Article 9 (Changes to This Policy)">
        <p>
          The Operator may change this Policy when the Service&apos;s features
          or applicable laws change. If the Software ever begins collecting User
          information, the Operator will revise this Policy beforehand and
          announce the change in the Service.
        </p>
      </TermsSection>

      <TermsSection title="Article 10 (Contact)">
        <p>For questions about this Policy, please contact:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Operator: ut.code();</li>
          <li>
            <ExternalLink href={FEEDBACK_FORM_URL}>Feedback form</ExternalLink>
          </li>
          <li>
            <ExternalLink href={ISSUES_URL}>GitHub Issues</ExternalLink>
          </li>
        </ul>
      </TermsSection>

      <p className="mt-8 text-right text-xs text-[#8e9aab]">End</p>
    </PolicyLayout>
  );
}

function PolicyLayout({
  lang,
  title,
  backLabel,
  onBack,
  children,
}: {
  lang: string;
  title: string;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main
      lang={lang}
      className="
        min-h-screen
        bg-[radial-gradient(circle_at_50%_45%,#fff_0,#f6f8fc_57%)]
        font-['Noto_Sans_JP',sans-serif]
        text-[#263143]
        antialiased
      "
    >
      <header
        className="
          flex min-h-17.5 items-center justify-between gap-4
          border-b border-[#e8ecf4]
          bg-white/80
          px-10.5
          max-[980px]:px-5.5
        "
      >
        <h1 className="text-lg font-bold tracking-[-0.3px] text-[#1d2c43]">
          {title}
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="
            cursor-pointer rounded-lg border border-[#dce3ff]
            bg-white px-3.5 py-2 text-xs font-bold text-[#586cec]
            transition hover:bg-[#f4f6ff]
          "
        >
          {backLabel}
        </button>
      </header>

      <article
        className="
          mx-auto my-8 w-[min(900px,calc(100%-40px))]
          rounded-2xl border border-[#e2e7f0]
          bg-white/90 px-8 py-9 shadow-[0_12px_35px_rgba(39,61,98,0.055)]
          max-[640px]:px-5 max-[640px]:py-6
        "
      >
        {children}
      </article>
    </main>
  );
}

// デスクトップ版では WebView 内で遷移しないよう、既定のブラウザで開く。
function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (isTauri()) {
          event.preventDefault();
          void openUrl(href);
        }
      }}
      className="text-[#586cec] underline"
    >
      {children}
    </a>
  );
}
