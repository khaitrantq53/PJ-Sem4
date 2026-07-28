package com.smartparking.common.security;

public final class RequestContext {
    public static final String REQUEST_ID = "requestId";

    private static final ThreadLocal<String> REQUEST_ID_HOLDER = new ThreadLocal<>();
    private static final ThreadLocal<String> IP_ADDRESS_HOLDER = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_AGENT_HOLDER = new ThreadLocal<>();

    private RequestContext() {
    }

    public static void setRequestId(String requestId) {
        REQUEST_ID_HOLDER.set(requestId);
    }

    public static void setClientMetadata(String ipAddress, String userAgent) {
        IP_ADDRESS_HOLDER.set(ipAddress);
        USER_AGENT_HOLDER.set(userAgent);
    }

    public static String requestId() {
        String requestId = REQUEST_ID_HOLDER.get();
        return requestId == null ? "UNKNOWN" : requestId;
    }

    public static String ipAddress() {
        return IP_ADDRESS_HOLDER.get();
    }

    public static String userAgent() {
        return USER_AGENT_HOLDER.get();
    }

    public static void clear() {
        REQUEST_ID_HOLDER.remove();
        IP_ADDRESS_HOLDER.remove();
        USER_AGENT_HOLDER.remove();
    }
}
