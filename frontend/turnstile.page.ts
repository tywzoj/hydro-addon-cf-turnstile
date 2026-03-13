import { $, addPage, AutoloadPage, NamedPage } from "@hydrooj/ui-default";

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
            },
        ) => string;
    };
}

addPage(
    new AutoloadPage("turnstile", () => {
        const siteKey = getTurnstileSiteKey();
        if (!siteKey) return;

        const form = $(".dialog--signin form");
        if (form.length === 0) return;

        void ensureTurnstileScript();

        const elementId = "cf-turnstile-dialog";
        createTurnstileContainer(elementId, form);
        renderTurnstile(elementId, siteKey, form);
    }),
);

addPage(
    new NamedPage(["user_login", "user_register"], () => {
        const siteKey = getTurnstileSiteKey();
        if (!siteKey) return;

        void ensureTurnstileScript();

        const form = $("form").not(".dialog--signin form");

        const elementId = "cf-turnstile-main";
        createTurnstileContainer(elementId, form);
        renderTurnstile(elementId, siteKey, form);
    }),
);

function getTurnstileSiteKey(): string | undefined {
    return UiContext.turnstileSiteKey as string | undefined;
}

function ensureTurnstileScript() {
    if (window.turnstilePromise) return window.turnstilePromise;

    window.turnstilePromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
        script.async = true;
        script.defer = true;
        window.onTurnstileLoad = () => {
            resolve();
        };
        script.onerror = () => reject(new Error("Failed to load Turnstile script"));
        document.head.appendChild(script);
    });

    return window.turnstilePromise;
}

function renderTurnstile(
    elementId: string,
    siteKey: string,
    form: JQuery<HTMLElement>,
    options?: { theme?: "auto" | "light" | "dark"; size?: "normal" | "compact" | "flexible" },
) {
    const submitButton = form.find("input[type=submit]");
    submitButton.prop("disabled", true).addClass("disabled").val("{{ _('Turnstile Validating') }}");

    void ensureTurnstileScript().then(() => {
        turnstile.render(`#${elementId}`, {
            ...options,
            sitekey: siteKey,
            callback: (token) => {
                const input = form.find("input[name='cf-turnstile-response']");
                if (input.length === 0) {
                    form.append(`<input type="hidden" name="cf-turnstile-response" value="${token}">`);
                } else {
                    input.val(token);
                }
                submitButton.prop("disabled", false).removeClass("disabled").val("{{ _('Login') }}");
            },
            "error-callback": () => {
                submitButton
                    .prop("disabled", true)
                    .addClass("disabled")
                    .val("{{ _('Turnstile verification failed') }}");
            },
            "expired-callback": () => {
                submitButton
                    .prop("disabled", true)
                    .addClass("disabled")
                    .val("{{ _('Turnstile verification failed') }}");
            },
        });
    });
}

function createTurnstileContainer(elementId: string, form: JQuery<HTMLElement>) {
    form.append(
        `<div class="row"><div class="columns"><div id="${elementId}" style="margin: 1rem 0;"></div></div></div>`,
    );
}
