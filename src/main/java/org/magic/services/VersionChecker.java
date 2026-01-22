package org.magic.services;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 * Server-safe VersionChecker.
 *
 * The original desktop project checks GitHub releases on startup. On hosted
 * platforms (Render/Fly/etc.), that can fail due to GitHub API rate limits and
 * should never prevent the service from starting.
 *
 * This implementation keeps the public API intact but makes remote checks
 * non-fatal (currently disabled for server runs).
 */
public class VersionChecker {

    private String actualVersion;
    private String onlineVersion;
    private final Logger logger = LogManager.getLogger(getClass());

    // Try a couple common resource names; fall back to 0.0
    private static final String[] VERSION_RESOURCES = new String[]{
            "/version.txt",
            "/VERSION",
            "/mtg-desktop-companion.version"
    };

    private String readVersionFromResources() {
        for (String res : VERSION_RESOURCES) {
            try (var in = getClass().getResourceAsStream(res)) {
                if (in == null) continue;
                try (var br = new BufferedReader(new InputStreamReader(in))) {
                    var line = br.readLine();
                    if (line != null && !line.isBlank() && !line.startsWith("${")) {
                        return line.trim();
                    }
                }
            } catch (Exception ignore) {
                // keep trying other resource names
            }
        }
        return "0.0";
    }

    public VersionChecker(boolean preRelease) {
        actualVersion = readVersionFromResources();
        // Disable remote version checks in server mode
        onlineVersion = actualVersion;
        if (preRelease) {
            logger.debug("Pre-release update checks are disabled in server mode.");
        }
    }

    public VersionChecker() {
        this(false);
    }

    public void setUpdatePreReleased(boolean updatePr) {
        // No-op in server mode; keep API compatibility
        onlineVersion = actualVersion;
    }

    public String getVersion() {
        return actualVersion;
    }

    public boolean hasNewVersion() {
        return false;
    }

    public String getOnlineVersion() {
        return onlineVersion;
    }
}
