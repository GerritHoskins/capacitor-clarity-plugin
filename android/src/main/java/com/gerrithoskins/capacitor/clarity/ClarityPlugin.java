package com.gerrithoskins.capacitor.clarity;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.microsoft.clarity.Clarity;
import com.microsoft.clarity.ClarityConfig;
import com.microsoft.clarity.models.ApplicationFramework;
import com.microsoft.clarity.models.LogLevel;
import java.lang.ref.WeakReference;
import java.util.Locale;
import kotlin.Unit;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Clarity")
public class ClarityPlugin extends Plugin {

    private boolean initialized;

    private void onMain(PluginCall call, boolean needsInitialization, Runnable action) {
        Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            call.reject("No active Activity is available.", "UNAVAILABLE");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                if (needsInitialization && !initialized) {
                    call.reject("Call initialize first.", "NOT_INITIALIZED");
                    return;
                }
                action.run();
            } catch (IllegalArgumentException exception) {
                call.reject(exception.getMessage(), "INVALID_ARGUMENT", exception);
            } catch (Exception exception) {
                call.reject("Clarity SDK call failed.", "CLARITY_SDK_ERROR", exception);
            }
        });
    }

    private String text(Object value, String name, int max) {
        if (!(value instanceof String) || ((String) value).trim().isEmpty() || ((String) value).length() > max) {
            throw new IllegalArgumentException(name + " must be a nonblank string of 1–" + max + " UTF-16 code units.");
        }
        return (String) value;
    }

    private String text(PluginCall call, String name) {
        return text(call.getData().opt(name), name, 255);
    }

    private boolean bool(PluginCall call, String name, Boolean fallback) {
        Object value = call.getData().opt(name);
        if (value == null && fallback != null) return fallback;
        if (!(value instanceof Boolean)) throw new IllegalArgumentException(name + " must be a boolean.");
        return (Boolean) value;
    }

    // User-selected policy: every false SDK command result rejects consistently.
    private boolean accepted(PluginCall call, Boolean result) {
        if (Boolean.TRUE.equals(result)) return true;
        call.reject("Clarity did not accept " + call.getMethodName() + ".", "CLARITY_SDK_REJECTED");
        return false;
    }

    private void resolve(PluginCall call, Boolean result) {
        if (accepted(call, result)) call.resolve();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        onMain(call, false, () -> {
            String projectId = text(call, "projectId");
            if (!projectId.matches("[a-zA-Z0-9]+")) throw new IllegalArgumentException("projectId must be alphanumeric.");
            Object rawLevel = call.getData().opt("logLevel");
            String level = rawLevel == null ? "none" : text(rawLevel, "logLevel", 255);
            if (!level.matches("verbose|debug|info|warning|error|none")) throw new IllegalArgumentException("Invalid logLevel.");
            LogLevel logLevel = LogLevel.valueOf(level.substring(0, 1).toUpperCase(Locale.ROOT) + level.substring(1));
            if (initialized) {
                call.reject("Clarity is already initialized.", "ALREADY_INITIALIZED");
                return;
            }
            ClarityConfig config = new ClarityConfig(projectId, null, logLevel, ApplicationFramework.Ionic, null);
            if (!accepted(call, Clarity.initialize(getActivity(), config))) return;
            initialized = true;
            // The global SDK must not retain a destroyed Capacitor bridge.
            WeakReference<ClarityPlugin> plugin = new WeakReference<>(this);
            if (
                !accepted(
                    call,
                    Clarity.setOnSessionStartedCallback((sessionId) -> {
                        ClarityPlugin current = plugin.get();
                        if (current != null) {
                            JSObject event = new JSObject();
                            event.put("sessionId", sessionId);
                            current.notifyListeners("sessionStarted", event, true);
                        }
                        return Unit.INSTANCE;
                    })
                )
            ) return;
            call.resolve();
        });
    }

    @PluginMethod
    public void setCustomUserId(PluginCall call) {
        onMain(call, true, () -> resolve(call, Clarity.setCustomUserId(text(call, "customUserId"))));
    }

    @PluginMethod
    public void setCustomSessionId(PluginCall call) {
        onMain(call, true, () -> resolve(call, Clarity.setCustomSessionId(text(call, "customSessionId"))));
    }

    @PluginMethod
    public void setCustomTag(PluginCall call) {
        onMain(call, true, () -> {
            String key = text(call, "key");
            Object value = call.getData().opt("value");
            String[] values;
            if (value instanceof JSONArray) {
                JSONArray array = (JSONArray) value;
                if (array.length() == 0) throw new IllegalArgumentException("value must contain at least one string.");
                values = new String[array.length()];
                for (int index = 0; index < array.length(); index++) values[index] = text(array.opt(index), "value", 255);
            } else {
                values = new String[] { text(value, "value", 255) };
            }
            resolve(call, Clarity.setCustomTag(key, values));
        });
    }

    @PluginMethod
    public void sendCustomEvent(PluginCall call) {
        onMain(call, true, () -> resolve(call, Clarity.sendCustomEvent(text(call.getData().opt("name"), "name", 254))));
    }

    @PluginMethod
    public void setCurrentScreenName(PluginCall call) {
        onMain(call, true, () -> {
            Object value = call.getData().opt("name");
            String name = value == JSONObject.NULL ? null : text(value, "name", 255);
            resolve(call, Clarity.setCurrentScreenName(name));
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        onMain(call, true, () -> resolve(call, Clarity.pause()));
    }

    @PluginMethod
    public void resume(PluginCall call) {
        onMain(call, true, () -> resolve(call, Clarity.resume()));
    }

    @PluginMethod
    public void isPaused(PluginCall call) {
        onMain(call, true, () -> {
            JSObject result = new JSObject();
            result.put("paused", Clarity.isPaused());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void startNewSession(PluginCall call) {
        onMain(call, true, () ->
            accepted(
                call,
                Clarity.startNewSession((sessionId) -> {
                    JSObject result = new JSObject();
                    result.put("sessionId", sessionId);
                    call.resolve(result);
                    return Unit.INSTANCE;
                })
            )
        );
    }

    @PluginMethod
    public void getCurrentSessionUrl(PluginCall call) {
        onMain(call, true, () -> {
            JSObject result = new JSObject();
            String url = Clarity.getCurrentSessionUrl();
            result.put("url", url == null ? JSONObject.NULL : url);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void consent(PluginCall call) {
        onMain(call, true, () -> resolve(call, Clarity.consent(bool(call, "adsStorage", false), bool(call, "analyticsStorage", null))));
    }
}
