import { $, addPage, AutoloadPage, i18n, NamedPage } from "@hydrooj/ui-default";

declare global {
    interface Window {
        turnstilePromise?: Promise<void>;
        onTurnstileLoad: () => void;
    }

    // https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/#complete-configuration-reference
    let turnstile: {
        render: (
            elemId: string,
            options: {
                sitekey: string;
                theme?: "auto" | "light" | "dark";
                size?: "normal" | "compact" | "flexible";
                callback?: (token: string) => void;
                "error-callback"?: () => void;
                "expired-callback"?: () => void;
                execution?: "render" | "execute";
                appearance?: "always" | "execute" | "interaction-only";
                action?: string;
            },
        ) => string;
    };
}

// Login dialog
addPage(
    new AutoloadPage("turnstile", () => {
        if (UserContext?._id) return;
        const siteKey = getTurnstileSiteKey();
        if (!siteKey) return;

        void ensureTurnstileScript();

        const form = $(".dialog--signin form");
        const elementId = "cf-turnstile-dialog";
        createTurnstileContainer(elementId, form);
        renderTurnstile(elementId, siteKey, form, {
            size: "compact",
            theme: "light",
            action: "login",
        });
    }),
);

addPage(
    new NamedPage(["user_login", "user_register"], (pagename) => {
        const siteKey = getTurnstileSiteKey();
        if (!siteKey) return;

        void ensureTurnstileScript();

        const form = $("form").not(".dialog--signin form");
        const elementId = "cf-turnstile-main";
        createTurnstileContainer(elementId, form);
        renderTurnstile(elementId, siteKey, form, {
            size: "flexible",
            theme: "light",
            action: pagename === "user_login" ? "login" : "register",
        });
    }),
);

function getTurnstileSiteKey(): string | undefined {
    return UiContext.turnstileSiteKey as string | undefined;
}

function ensureTurnstileScript() {
    if (window.turnstilePromise) return window.turnstilePromise;

    window.turnstilePromise = new Promise((resolve, reject) => {
        window.onTurnstileLoad = () => resolve();
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error("Failed to load Turnstile script"));
        document.head.appendChild(script);
    });

    return window.turnstilePromise;
}

function renderTurnstile(
    elementId: string,
    siteKey: string,
    form: JQuery<HTMLElement>,
    options?: Omit<
        Parameters<typeof turnstile.render>[1],
        "sitekey" | "callback" | "error-callback" | "expired-callback"
    >,
) {
    const submitButton = form.find("input[type=submit]");
    submitButton.prop("disabled", true).addClass("disabled").val(i18n("Turnstile Validating"));

    void ensureTurnstileScript()
        .then(() => {
            turnstile.render(`#${elementId}`, {
                execution: "render",
                appearance: "always",
                ...options,
                sitekey: siteKey,
                callback: () => {
                    submitButton.prop("disabled", false).removeClass("disabled").val(i18n("Login"));
                },
                "error-callback": () => {
                    submitButton.prop("disabled", true).addClass("disabled").val(i18n("Turnstile verification failed"));
                },
                "expired-callback": () => {
                    submitButton.prop("disabled", true).addClass("disabled").val(i18n("Turnstile verification failed"));
                },
            });
        })
        .catch(() => {
            submitButton.prop("disabled", true).addClass("disabled").val(i18n("Turnstile verification failed"));
        });
}

function createTurnstileContainer(elementId: string, form: JQuery<HTMLElement>) {
    form.append(
        `<div class="row"><div class="columns"><div id="${elementId}" style="margin: 1rem 0;"></div></div></div>`,
    );
}
