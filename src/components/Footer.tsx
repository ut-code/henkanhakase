import { useState } from "react";
import Logo from "../assets/logo.svg";
import { useTranslation } from "../i18n";
import { readLicense } from "../license-links";
import { LicenseViewer } from "./LicenseViewer";

export default function Footer() {
  const { t } = useTranslation();
  const [license, setLicense] = useState<{
    title: string;
    fileName: string;
  } | null>(null);
  const [licenseText, setLicenseText] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const showLicense = async (title: string, fileName: string) => {
    setLicense({ title, fileName });
    setLicenseText(null);
    setLicenseError(null);
    try {
      setLicenseText(await readLicense(fileName));
    } catch (error) {
      console.error("Failed to load license", error);
      setLicenseError(
        error instanceof Error ? error.message : "Failed to load license",
      );
    }
  };

  return (
    <footer className="mt-auto bg-[#586cec] px-6 py-12 text-white">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <div className="flex items-center">
            <img
              src={Logo}
              alt=""
              aria-hidden="true"
              className="mb-4 size-16 brightness-0 invert"
            />
            <span className="ml-2 text-2xl font-bold tracking-tight">
              {t("appName")}
            </span>
          </div>
          <p className="mt-2 text-lg font-bold text-white">
            {t("catchPhrase")}
          </p>
          <a
            href="https://github.com/ut-code/henkanhakase"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-sm text-white"
          >
            <img
              src="github-logo.png"
              alt="GitHub"
              className="inline-block h-5 w-auto"
            />
            <span className="ml-2">ut-code/henkanhakase</span>
          </a>
          <p className="mt-2 text-xs text-white">Copyright © 2026 ut.code();</p>
        </div>

        <div className="text-center text-sm md:text-left">
          <h2 className="mb-4 font-bold">{t("about")}</h2>
          <div className="flex flex-col items-center gap-3 text-white md:items-start">
            <a href="#terms" className="text-white hover:underline">
              {t("terms")}
            </a>
            <button
              type="button"
              onClick={() => void showLicense(t("license"), "LICENSE")}
              className="cursor-pointer text-white hover:underline"
            >
              {t("license")}
            </button>
            <button
              type="button"
              onClick={() =>
                void showLicense(
                  t("thirdPartyLicenses"),
                  "THIRD_PARTY_LICENSES.txt",
                )
              }
              className="cursor-pointer text-white hover:underline"
            >
              {t("thirdPartyLicenses")}
            </button>
          </div>
        </div>

        <div className="text-center text-sm md:text-left">
          <h2 className="mb-4 font-bold">{t("aboutUtcode")}</h2>
          <img
            src="utc-logo.svg"
            alt="ut.code();"
            className="mx-auto mb-4 h-12 w-auto md:mx-0"
          />
          <div className="flex flex-col items-center gap-3 text-white md:items-start">
            <a
              href="https://utcode.net/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("website")}
            </a>
            <a
              href="https://x.com/utokyo_code"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("x")}
            </a>
          </div>
        </div>
      </div>
      {license && licenseText !== null && (
        <LicenseViewer
          title={license.title}
          text={licenseText}
          onClose={() => {
            setLicense(null);
            setLicenseText(null);
          }}
        />
      )}
      {license && licenseError !== null && (
        <LicenseViewer
          title={license.title}
          text={licenseError}
          onClose={() => {
            setLicense(null);
            setLicenseText(null);
            setLicenseError(null);
          }}
        />
      )}
    </footer>
  );
}
