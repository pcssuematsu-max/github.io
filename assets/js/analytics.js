(() => {
    "use strict";

    // Google Analytics の「測定ID」（G-XXXXXXXXXX）をここに設定します。
    // 空のままでは、計測も同意バナーも表示されません。
    const measurementId = "G-WYY3KML7FX";
    const consentKey = "cube-kingdom-analytics-consent";

    if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
        return;
    }

    const getConsent = () => {
        try {
            return window.localStorage.getItem(consentKey);
        } catch {
            return null;
        }
    };

    const setConsent = (value) => {
        try {
            window.localStorage.setItem(consentKey, value);
        } catch {
            // 同意状態を保存できない環境では、そのページだけの選択として扱います。
        }
    };

    const loadAnalytics = () => {
        if (window.__cubeKingdomAnalyticsLoaded) {
            return;
        }
        window.__cubeKingdomAnalyticsLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag() {
            window.dataLayer.push(arguments);
        };
        window.gtag("consent", "default", {
            analytics_storage: "granted",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied"
        });
        window.gtag("js", new Date());
        window.gtag("config", measurementId);

        const tag = document.createElement("script");
        tag.async = true;
        tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.append(tag);
    };

    const disableAnalytics = () => {
        if (window.gtag) {
            window.gtag("consent", "update", {
                analytics_storage: "denied",
                ad_storage: "denied",
                ad_user_data: "denied",
                ad_personalization: "denied"
            });
        }
    };

    const removeBanner = () => document.getElementById("analytics-consent-banner")?.remove();

    const showBanner = () => {
        if (document.getElementById("analytics-consent-banner")) {
            return;
        }

        const banner = document.createElement("section");
        banner.id = "analytics-consent-banner";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-label", "アクセス解析の設定");
        banner.innerHTML = `
            <style>
                #analytics-consent-banner { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; max-width: 420px; padding: 18px; color: #1e2430; background: #fff; border: 1px solid #d7dce5; border-radius: 14px; box-shadow: 0 12px 40px rgba(17, 24, 39, .2); font: 14px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; }
                #analytics-consent-banner p { margin: 0 0 12px; }
                #analytics-consent-banner a { color: inherit; text-underline-offset: 2px; }
                #analytics-consent-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
                #analytics-consent-actions button { padding: 8px 12px; border: 1px solid #334155; border-radius: 8px; color: #fff; background: #334155; font: inherit; cursor: pointer; }
                #analytics-consent-actions button:last-child { color: #334155; background: #fff; }
                @media (max-width: 520px) { #analytics-consent-banner { right: 10px; bottom: 10px; left: 10px; max-width: none; } }
            </style>
            <p>このサイトでは、利用状況の把握のため Google Analytics を使用します。許可すると、アクセス解析用のCookieが保存されます。詳しくは<a href="privacy.html">プライバシーポリシー</a>をご覧ください。</p>
            <div id="analytics-consent-actions">
                <button type="button" data-analytics-consent="granted">許可する</button>
                <button type="button" data-analytics-consent="denied">許可しない</button>
            </div>`;
        banner.addEventListener("click", (event) => {
            const button = event.target.closest("[data-analytics-consent]");
            if (!button) {
                return;
            }
            const choice = button.dataset.analyticsConsent;
            setConsent(choice);
            removeBanner();
            if (choice === "granted") {
                loadAnalytics();
            } else {
                disableAnalytics();
            }
        });
        document.body.append(banner);
    };

    const openConsentSettings = () => {
        try {
            window.localStorage.removeItem(consentKey);
        } catch {
            // 保存できない環境でも、現在のページで再選択できます。
        }
        showBanner();
    };

    window.CubeKingdomAnalytics = { openConsentSettings };

    document.addEventListener("DOMContentLoaded", () => {
        if (getConsent() === "granted") {
            loadAnalytics();
        } else if (getConsent() !== "denied") {
            showBanner();
        }
    });
})();
