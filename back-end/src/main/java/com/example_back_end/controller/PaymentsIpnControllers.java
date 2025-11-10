package com.example_back_end.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/payments")
public class PaymentsIpnControllers {

    @Value("${payments.vnpay.hash_secret:}") private String vnpHashSecret;
    @Value("${payments.momo.secret_key:}") private String momoSecret;

    @GetMapping("/vnpay/ipn")
    public ResponseEntity<String> vnpayIpn(HttpServletRequest req) {
        // Collect vnp_* params
        SortedMap<String,String> params = new TreeMap<>();
        String secureHash = null;
        for (Map.Entry<String, String[]> entry : req.getParameterMap().entrySet()) {
            String k = entry.getKey();
            if (!k.startsWith("vnp_")) continue;
            String[] arr = entry.getValue();
            String val = arr != null && arr.length > 0 ? arr[0] : null;
            if ("vnp_SecureHash".equals(k)) {
                secureHash = val;
            } else if (!"vnp_SecureHashType".equals(k)) {
                params.put(k, val);
            }
        }
        String data = buildQuery(params);
        String hash = hmacSHA512(vnpHashSecret, data);
        if (secureHash != null && secureHash.equalsIgnoreCase(hash)) {
            // vnp_ResponseCode == "00" -> PAID. Ở đây chỉ trả OK.
            return ResponseEntity.ok("OK");
        }
        return ResponseEntity.badRequest().body("INVALID_SIGNATURE");
    }

    @PostMapping("/momo/ipn")
    public ResponseEntity<String> momoIpn(@RequestBody Map<String,Object> body) {
        // Verify signature
        String partnerCode = str(body.get("partnerCode"));
        String accessKey   = str(body.get("accessKey"));
        String amount      = str(body.get("amount"));
        String orderId     = str(body.get("orderId"));
        String orderInfo   = str(body.get("orderInfo"));
        String orderType   = str(body.get("orderType"));
        String transId     = str(body.get("transId"));
        String resultCode  = str(body.get("resultCode"));
        String message     = str(body.get("message"));
        String payType     = str(body.get("payType"));
        String requestId   = str(body.get("requestId"));
        String responseTime= str(body.get("responseTime"));
        String extraData   = str(body.get("extraData"));
        String signature   = str(body.get("signature"));

        String raw = "accessKey="+accessKey+"&amount="+amount+"&extraData="+extraData+
                "&message="+message+"&orderId="+orderId+"&orderInfo="+orderInfo+
                "&orderType="+orderType+"&partnerCode="+partnerCode+"&payType="+payType+
                "&requestId="+requestId+"&responseTime="+responseTime+"&resultCode="+resultCode+
                "&transId="+transId;
        String calc = hmacSHA256(momoSecret, raw);
        if (signature != null && signature.equalsIgnoreCase(calc)) {
            return ResponseEntity.ok("OK");
        }
        return ResponseEntity.badRequest().body("INVALID_SIGNATURE");
    }

    private static String buildQuery(SortedMap<String,String> params){
        StringBuilder sb = new StringBuilder();
        boolean first=true;
        for (Map.Entry<String,String> e: params.entrySet()){
            if(!first) sb.append('&'); first=false;
            sb.append(e.getKey()).append('=').append(urlEncode(e.getValue()));
        }
        return sb.toString();
    }
    private static String urlEncode(String s){ return s==null? "": java.net.URLEncoder.encode(s, StandardCharsets.UTF_8); }
    private static String str(Object v){ return v==null? null: String.valueOf(v); }
    private static String hmacSHA512(String secret, String data){
        try{
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA512"));
            byte[] bytes=mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb=new StringBuilder();
            for(byte b:bytes) sb.append(String.format("%02x",b));
            return sb.toString();
        }catch(Exception e){ throw new RuntimeException(e);} }
    private static String hmacSHA256(String secret, String data){
        try{
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            byte[] bytes=mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb=new StringBuilder();
            for(byte b:bytes) sb.append(String.format("%02x",b));
            return sb.toString();
        }catch(Exception e){ throw new RuntimeException(e);} }
}

