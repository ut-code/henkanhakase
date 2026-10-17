import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "../i18n";
import { readLicense } from "../license-links";
import { LicenseViewer } from "./LicenseViewer";

interface TermsOfServiceProps {
  onBack: () => void;
}

export function TermsOfService({ onBack }: TermsOfServiceProps) {
  const { locale } = useTranslation();
  const licenseViewer = useLicenseViewer();

  if (locale === "en") {
    return <EnglishTermsOfService onBack={onBack} />;
  }

  return (
    <main
      lang="ja"
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
          flex h-17.5 items-center justify-between
          border-b border-[#e8ecf4]
          bg-white/80
          px-10.5
          max-[980px]:px-5.5
        "
      >
        <h1 className="text-lg font-bold tracking-[-0.3px] text-[#1d2c43]">
          変換はかせ 利用規約
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
          変換はかせに戻る
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
        <p className="mb-8 text-right text-xs text-[#8e9aab]">
          制定日：2026年10月17日
        </p>

        <p className="mb-6 leading-8">
          本利用規約（以下「本規約」といいます。）は、ut.code();（以下「運営者」といいます。）が
          「変換はかせ」の名称で提供するサービス（以下「本サービス」といいます。）の提供条件
          及び本サービスをご利用いただくお客様（以下「ユーザー」といいます。）と運営者との間
          の権利義務関係を定めるものです。本サービスのご利用に際しては、本規約の全文をお読み
          ください。
        </p>
        <p className="mb-8 leading-8">
          ユーザーは、本規約に承諾の上、本サービスの利用を開始するものとし、本サービスを利用
          した場合、本規約を承諾したものとみなします。
        </p>

        <TermsSection title="第1条（定義）">
          <p>本規約において使用する用語の意味は、次のとおりとします。</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              「本サービス」とは、運営者が「変換はかせ」として提供するファイル変換サービスをいいます。
            </li>
            <li>
              「本ソフトウェア」とは、本サービスを構成するウェブアプリケーション、デスクトップアプリケーション及び関連プログラムをいいます。
            </li>
            <li>
              「対応端末」とは、本サービスを利用できるブラウザを備えた端末、並びにWindows、macOS又はLinuxを搭載した端末をいいます。
            </li>
            <li>
              「ユーザーコンテンツ」とは、ユーザーが本サービスに入力、アップロード又は変換させるファイルその他のデータをいいます。
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="第2条（本サービスの利用）">
          <ol className="list-decimal space-y-2 pl-6">
            <li>本サービスは、ユーザー登録を行うことなく利用できます。</li>
            <li>
              ユーザーは、ブラウザ上で本サービスを利用できるほか、ブラウザからWindows、macOS又はLinux向けのデスクトップアプリケーションをダウンロードして利用できます。
            </li>
            <li>
              本サービスは、無料で利用できます。ただし、本サービスの利用に必要な通信費、端末費用その他の費用は、ユーザーが負担するものとします。
            </li>
            <li>
              ユーザーは、自己の責任と費用において対応端末、通信環境及び必要なソフトウェアを準備するものとします。
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="第3条（ユーザーコンテンツ）">
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              ユーザーは、ユーザーコンテンツについて、適法に本サービスで利用する権利を有していることを保証するものとします。
            </li>
            <li>
              ユーザーコンテンツの内容、バックアップ及び管理は、ユーザー自身の責任で行うものとします。
            </li>
            <li>運営者は、ユーザーコンテンツを利用する権利を取得しません。</li>
          </ol>
        </TermsSection>

        <TermsSection title="第4条（禁止事項）">
          <p>
            ユーザーは、本サービスの利用にあたり、次の行為をしてはなりません。
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>法令又は公序良俗に違反する行為</li>
            <li>犯罪行為又は犯罪行為に結びつく行為</li>
            <li>
              運営者、他のユーザー又は第三者の著作権、商標権、プライバシーその他の権利又は利益を侵害する行為
            </li>
            <li>本サービスの運営を妨害する行為</li>
            <li>
              本サービスを利用して、第三者に迷惑、不利益又は損害を与える行為
            </li>
            <li>運営者になりすます行為、又は虚偽の情報を提供する行為</li>
            <li>その他、運営者が不適切と合理的に判断する行為</li>
          </ol>
        </TermsSection>

        <TermsSection title="第5条（サービスの停止）">
          <p>
            運営者は、次のいずれかに該当する場合、ユーザーに事前に通知することなく、本サービス
            の全部又は一部を停止又は中断できるものとします。
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>本サービスの保守、点検、修理又は仕様変更を行う場合</li>
            <li>
              天災地変、疫病の蔓延、戦争、暴動その他の不可抗力により提供が困難となった場合
            </li>
            <li>
              その他、運営者が本サービスの停止又は中断が必要と判断した場合
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="第6条（免責事項）">
          <p>
            運営者は、天災地変、疫病の蔓延、戦争、暴動、内乱、火災、洪水、法令の改廃制定、
            公権力の介入、ストライキその他の労働争議、輸送機関の事故その他運営者の責に帰すべから
            ざる事由により本サービスを提供できないことその他の結果について、損害賠償責任その他
            一切の責任を負わないものとします。ただし、運営者の故意又は重過失による場合を除きます。
          </p>
          <p>
            本サービスは現状有姿で提供されます。運営者は、本サービスがユーザーの特定の目的に
            適合すること、常に利用できること、正確性、完全性又は安全性を保証しません。ユーザー
            が本サービスを利用して行った変換結果の利用については、ユーザー自身が責任を負うもの
            とします。
          </p>
        </TermsSection>

        <TermsSection title="第7条（サービス内容の変更・終了）">
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              運営者は、運営者の都合により、予告なく本サービスの内容を変更し、又は提供を終了できるものとします。
            </li>
            <li>
              運営者は、本条に基づき運営者が行った措置によって生じた損害について、一切の責任を負いません。
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="第8条（利用規約の変更）">
          <p>
            運営者は、必要と判断した場合、法令に反しない範囲で本規約を変更できます。変更後にユーザーが本サービスを利用した場合、変更後の本規約に同意した
            ものとみなします。
          </p>
        </TermsSection>

        <TermsSection title="第9条（著作権及びライセンス）">
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              本ソフトウェアのソースコードは、MIT
              Licenseに基づき公開されています。MIT
              Licenseの全文は、プロジェクトの
              <button
                type="button"
                onClick={() => {
                  void licenseViewer.show("LICENSEファイル", "LICENSE");
                }}
                className="text-[#586cec] underline"
              >
                LICENSEファイル
              </button>
              を参照してください。
            </li>
            <li>
              本サービスに含まれるFFmpegその他の第三者ソフトウェアは、本ソフトウェアとは別のライセンスに従います。適用されるライセンスの詳細は、
              <button
                type="button"
                onClick={() => {
                  void licenseViewer.show(
                    "ライセンス情報",
                    "THIRD_PARTY_LICENSES.txt",
                  );
                }}
                className="text-[#586cec] underline"
              >
                ライセンス情報
              </button>
              を参照してください。
            </li>
            <li>
              ユーザーコンテンツに関する権利は、ユーザー又は正当な権利者に帰属します。本規約は、ユーザーコンテンツに関する権利を運営者に移転するものではありません。
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="第10条（準拠法及び裁判管轄）">
          <p>
            本規約は、日本法を準拠法とします。本サービス又は本規約に関して紛争が生じた場合、
            東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </TermsSection>

        <p className="mt-8 text-right text-xs text-[#8e9aab]">以上</p>
      </article>
      {licenseViewer.element}
    </main>
  );
}

function EnglishTermsOfService({ onBack }: TermsOfServiceProps) {
  const licenseViewer = useLicenseViewer();
  return (
    <main
      lang="en"
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
          Henkan Hakase Terms of Service
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="
              cursor-pointer rounded-lg border border-[#dce3ff]
              bg-white px-3.5 py-2 text-xs font-bold text-[#586cec]
              transition hover:bg-[#f4f6ff]
            "
          >
            Back to Henkan Hakase
          </button>
        </div>
      </header>

      <article
        className="
          mx-auto my-8 w-[min(900px,calc(100%-40px))]
          rounded-2xl border border-[#e2e7f0]
          bg-white/90 px-8 py-9 shadow-[0_12px_35px_rgba(39,61,98,0.055)]
          max-[640px]:px-5 max-[640px]:py-6
        "
      >
        <p className="mb-8 text-right text-xs text-[#8e9aab]">
          Effective date: October 17, 2026
        </p>

        <p className="mb-6 leading-8">
          These Terms of Service (the &quot;Terms&quot;) set forth the terms and
          conditions for the service provided under the name &quot;Henkan
          Hakase&quot; (the &quot;Service&quot;) by ut.code(); (the
          &quot;Operator&quot;) and the rights and obligations between the
          Operator and customers who use the Service (the &quot;Users&quot;).
          Please read these Terms in full before using the Service.
        </p>
        <p className="mb-8 leading-8">
          By starting to use the Service, Users agree to these Terms. A User who
          uses the Service is deemed to have accepted these Terms.
        </p>

        <TermsSection title="Article 1 (Definitions)">
          <p>The following terms have the meanings set out below.</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              &quot;Service&quot; means the file conversion service provided by
              the Operator as &quot;Henkan Hakase.&quot;
            </li>
            <li>
              &quot;Software&quot; means the web application, desktop
              applications, and related programs that make up the Service.
            </li>
            <li>
              &quot;Supported Devices&quot; means devices with a browser capable
              of using the Service and devices running Windows, macOS, or Linux.
            </li>
            <li>
              &quot;User Content&quot; means files and other data entered,
              uploaded, or converted by a User through the Service.
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 2 (Use of the Service)">
          <ol className="list-decimal space-y-2 pl-6">
            <li>The Service can be used without creating a user account.</li>
            <li>
              Users may use the Service in a browser or download and use a
              desktop application for Windows, macOS, or Linux from the browser.
            </li>
            <li>
              The Service is free of charge. Users are responsible for
              communication charges, device costs, and all other costs required
              to use the Service.
            </li>
            <li>
              Users must prepare and maintain Supported Devices, a network
              environment, and any necessary software at their own
              responsibility and expense.
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 3 (User Content)">
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              Users represent and warrant that they have the lawful right to use
              User Content with the Service.
            </li>
            <li>
              Users are responsible for the content, backup, and management of
              their User Content.
            </li>
            <li>The Operator does not acquire any rights to User Content.</li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 4 (Prohibited Activities)">
          <p>Users must not engage in any of the following activities:</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Activities that violate laws or public order and morals</li>
            <li>Criminal activities or activities connected to them</li>
            <li>
              Infringing the copyrights, trademarks, privacy, or other rights or
              interests of the Operator, other Users, or third parties
            </li>
            <li>Interfering with the operation of the Service</li>
            <li>
              Using the Service to cause inconvenience, disadvantage, or damage
              to third parties
            </li>
            <li>Impersonating the Operator or providing false information</li>
            <li>
              Any other activity the Operator reasonably considers inappropriate
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 5 (Suspension of the Service)">
          <p>
            The Operator may suspend or interrupt all or part of the Service
            without prior notice if any of the following applies:
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              Maintenance, inspection, repair, or specification changes to the
              Service
            </li>
            <li>
              Providing the Service becomes difficult due to a natural disaster,
              epidemic, war, riot, or other force majeure
            </li>
            <li>
              The Operator otherwise determines that suspension or interruption
              is necessary
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 6 (Disclaimers)">
          <p>
            The Operator shall not be liable for damages or any other liability
            arising from the inability to provide the Service or any other
            consequence caused by natural disasters, epidemics, war, riots,
            civil disturbances, fires, floods, enactment, amendment or repeal of
            laws, intervention by public authorities, strikes or other labor
            disputes, transportation accidents, or any other cause not
            attributable to the Operator. This does not apply in cases of the
            Operator&apos;s willful misconduct or gross negligence.
          </p>
          <p>
            The Service is provided on an &quot;as is&quot; basis. The Operator
            does not warrant that the Service will meet a User&apos;s specific
            purpose, remain continuously available, or be accurate, complete, or
            secure. Users are responsible for the use of conversion results
            obtained through the Service.
          </p>
        </TermsSection>

        <TermsSection title="Article 7 (Changes to or Termination of the Service)">
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              The Operator may change the content of or terminate the Service
              without prior notice at the Operator&apos;s discretion.
            </li>
            <li>
              The Operator shall not be liable for damages arising from any
              measures taken under this Article.
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 8 (Changes to These Terms)">
          <p>
            The Operator may change these Terms when necessary to the extent
            permitted by law. If a User uses the Service after the change
            becomes effective, the User is deemed to have agreed to the revised
            Terms.
          </p>
        </TermsSection>

        <TermsSection title="Article 9 (Copyright and Licenses)">
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              The source code of the Software is released under the MIT License.
              The full text is available in the project&apos;s{" "}
              <button
                type="button"
                onClick={() => {
                  void licenseViewer.show("LICENSE file", "LICENSE");
                }}
                className="text-[#586cec] underline"
              >
                LICENSE file
              </button>
              .
            </li>
            <li>
              FFmpeg and other third-party software included in the Service are
              subject to separate licenses. The applicable license information
              is available in the{" "}
              <button
                type="button"
                onClick={() => {
                  void licenseViewer.show(
                    "License information",
                    "THIRD_PARTY_LICENSES.txt",
                  );
                }}
                className="text-[#586cec] underline"
              >
                license information
              </button>
              .
            </li>
            <li>
              Rights to User Content belong to the User or the applicable rights
              holder. These Terms do not transfer any rights in User Content to
              the Operator.
            </li>
          </ol>
        </TermsSection>

        <TermsSection title="Article 10 (Governing Law and Jurisdiction)">
          <p>
            These Terms are governed by the laws of Japan. The Tokyo District
            Court shall have exclusive jurisdiction as the court of first
            instance over any dispute concerning the Service or these Terms.
          </p>
        </TermsSection>

        <p className="mt-8 text-right text-xs text-[#8e9aab]">End</p>
      </article>
      {licenseViewer.element}
    </main>
  );
}

function useLicenseViewer() {
  const [license, setLicense] = useState<{
    title: string;
    text: string;
  } | null>(null);

  const show = async (title: string, fileName: string) => {
    try {
      setLicense({ title, text: await readLicense(fileName) });
    } catch (error) {
      console.error("Failed to load license", error);
    }
  };

  return {
    show,
    element: license ? (
      <LicenseViewer
        title={license.title}
        text={license.text}
        onClose={() => setLicense(null)}
      />
    ) : null,
  };
}

function TermsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-3 text-base font-bold text-[#26354a]">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-[#40506a]">
        {children}
      </div>
    </section>
  );
}
