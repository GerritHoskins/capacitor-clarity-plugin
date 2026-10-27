import Foundation
import CoreFoundation
import Capacitor
import Clarity

private struct ArgumentError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

@objc(ClarityPlugin)
public class ClarityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ClarityPlugin"
    public let jsName = "Clarity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCustomUserId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCustomSessionId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCustomTag", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendCustomEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCurrentScreenName", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isPaused", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startNewSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentSessionUrl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consent", returnType: CAPPluginReturnPromise)
    ]
    private var initialized = false

    private func onMain(_ call: CAPPluginCall, needsInitialization: Bool, action: @escaping () throws -> Void) {
        DispatchQueue.main.async {
            guard !needsInitialization || self.initialized else {
                call.reject("Call initialize first.", "NOT_INITIALIZED")
                return
            }
            do {
                try action()
            } catch {
                call.reject(error.localizedDescription, "INVALID_ARGUMENT", error)
            }
        }
    }

    private func text(_ value: Any?, name: String, max: Int = 255) throws -> String {
        guard let value = value as? String,
              !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              value.utf16.count <= max else {
            throw ArgumentError(message: "\(name) must be a nonblank string of 1–\(max) UTF-16 code units.")
        }
        return value
    }

    private func boolean(_ call: CAPPluginCall, name: String, fallback: Bool? = nil) throws -> Bool {
        guard let value = call.options[name] else {
            if let fallback = fallback { return fallback }
            throw ArgumentError(message: "\(name) must be a boolean.")
        }
        guard let number = value as? NSNumber,
              CFGetTypeID(number) == CFBooleanGetTypeID() else {
            throw ArgumentError(message: "\(name) must be a boolean.")
        }
        return number.boolValue
    }

    // User-selected policy: every false SDK command result rejects consistently.
    @discardableResult
    private func accepted(_ call: CAPPluginCall, _ result: Bool) -> Bool {
        if !result { call.reject("Clarity did not accept \(call.methodName).", "CLARITY_SDK_REJECTED") }
        return result
    }

    private func resolve(_ call: CAPPluginCall, _ result: Bool) {
        if accepted(call, result) { call.resolve() }
    }

    @objc func initialize(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: false) {
            let projectId = try self.text(call.options["projectId"], name: "projectId")
            guard projectId.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil else {
                throw ArgumentError(message: "projectId must be alphanumeric.")
            }
            let levels: [String: ClarityLogLevel] = [
                "verbose": .verbose, "debug": .debug, "info": .info,
                "warning": .warning, "error": .error, "none": .none
            ]
            let levelName = try call.options["logLevel"].map { try self.text($0, name: "logLevel") } ?? "none"
            guard let level = levels[levelName] else { throw ArgumentError(message: "Invalid logLevel.") }
            guard !self.initialized else {
                call.reject("Clarity is already initialized.", "ALREADY_INITIALIZED")
                return
            }
            let config = ClarityConfig(projectId: projectId, logLevel: level, applicationFramework: .ionic)
            guard self.accepted(call, ClaritySDK.initialize(config: config)) else { return }
            self.initialized = true
            guard self.accepted(call, ClaritySDK.setOnSessionStartedCallback { [weak self] sessionId in
                self?.notifyListeners("sessionStarted", data: ["sessionId": sessionId], retainUntilConsumed: true)
            }) else { return }
            call.resolve()
        }
    }

    @objc func setCustomUserId(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            let userId = try self.text(call.options["customUserId"], name: "customUserId")
            self.resolve(call, ClaritySDK.setCustomUserId(userId))
        }
    }

    @objc func setCustomSessionId(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            let sessionId = try self.text(call.options["customSessionId"], name: "customSessionId")
            self.resolve(call, ClaritySDK.setCustomSessionId(sessionId))
        }
    }

    @objc func setCustomTag(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            let key = try self.text(call.options["key"], name: "key")
            let raw = call.options["value"]
            let values: [String]
            if let array = raw as? [Any] {
                guard !array.isEmpty else { throw ArgumentError(message: "value must contain at least one string.") }
                values = try array.map { try self.text($0, name: "value") }
            } else {
                values = [try self.text(raw, name: "value")]
            }
            self.resolve(call, ClaritySDK.setCustomTag(key: key, values: Set(values)))
        }
    }

    @objc func sendCustomEvent(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            let name = try self.text(call.options["name"], name: "name", max: 254)
            self.resolve(call, ClaritySDK.sendCustomEvent(value: name))
        }
    }

    @objc func setCurrentScreenName(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            let raw = call.options["name"]
            let name: String?
            if raw is NSNull {
                name = nil
            } else {
                name = try self.text(raw, name: "name")
            }
            self.resolve(call, ClaritySDK.setCurrentScreenName(name))
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            ClaritySDK.pause()
            call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            ClaritySDK.resume()
            call.resolve()
        }
    }

    @objc func isPaused(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) { call.resolve(["paused": ClaritySDK.isPaused()]) }
    }

    @objc func startNewSession(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            self.accepted(call, ClaritySDK.startNewSession { sessionId in call.resolve(["sessionId": sessionId]) })
        }
    }

    @objc func getCurrentSessionUrl(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            call.resolve(["url": ClaritySDK.getCurrentSessionUrl().map { $0 as Any } ?? NSNull()])
        }
    }

    @objc func consent(_ call: CAPPluginCall) {
        onMain(call, needsInitialization: true) {
            let analytics = try self.boolean(call, name: "analyticsStorage")
            // Validate the cross-platform option, but the iOS SDK has no ads flag.
            _ = try self.boolean(call, name: "adsStorage", fallback: false)
            self.resolve(call, ClaritySDK.consent(analyticsStorage: analytics))
        }
    }
}
