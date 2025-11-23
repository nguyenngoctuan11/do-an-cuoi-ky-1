package com.example.back_end.controller;

import com.example.back_end.repository.CourseRepository;
import com.example.back_end.service.AnalyticsService;
import com.example.back_end.service.PaymentGatewayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentsController {

    private final PaymentGatewayService gateway;
    private final AnalyticsService analyticsService;
    private final CourseRepository courseRepository;

    public PaymentsController(PaymentGatewayService gateway,
                              AnalyticsService analyticsService,
                              CourseRepository courseRepository) {
        this.gateway = gateway;
        this.analyticsService = analyticsService;
        this.courseRepository = courseRepository;
    }

    @PostMapping(value = "/checkout", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> checkout(@RequestBody Map<String, Object> body,
                                                        HttpServletRequest request) {
        String method = str(body.get("method"));
        BigDecimal amount = toDecimal(body.get("amount"));
        String courseKey = str(body.get("course_key"));
        Long courseId = resolveCourseId(body.get("course_id"), courseKey);
        String orderId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String orderInfo = "Payment for course " + (courseKey != null ? courseKey : orderId);
        long amountVnd = amount != null ? amount.longValue() : 0L;

        Map<String, Object> res = new LinkedHashMap<>();

        try {
            if (eq(method, "VNPAY")) {
                String clientIp = clientIp(request);
                String url = gateway.createVnpayUrl(orderId, amountVnd, orderInfo, clientIp);
                res.put("paymentUrl", url);
                res.put("gateway", "VNPAY");
                res.put("orderId", orderId);
                return ResponseEntity.ok(res);
            } else if (eq(method, "MOMO")) {
                String url = gateway.createMomoUrl(orderId, amountVnd, orderInfo);
                res.put("paymentUrl", url);
                res.put("gateway", "MOMO");
                res.put("orderId", orderId);
                return ResponseEntity.ok(res);
            }
        } catch (Exception ex) {
            res.put("error", "gateway_error");
            res.put("message", ex.getMessage());
            return ResponseEntity.badRequest().body(res);
        }

        // BANK/COD: mark as paid immediately (manual transfer / COD handled outside)
        res.put("status", "PAID");
        res.put("paid", true);
        res.put("orderId", orderId);
        if (courseId != null) {
            analyticsService.trackCoursePayment(courseId);
        }
        return ResponseEntity.ok(res);
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }
    private static boolean eq(String a, String b) { return a != null && a.equalsIgnoreCase(b); }
    private static BigDecimal toDecimal(Object v) { try { return v==null? null : new BigDecimal(String.valueOf(v)); } catch (Exception e) { return null; } }
    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) return null;
        try { return Long.parseLong(s); } catch (NumberFormatException e) { return null; }
    }
    private static String clientIp(HttpServletRequest req){
        String xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) return xf.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private Long resolveCourseId(Object idValue, Object keyValue) {
        Long id = toLong(idValue);
        if (id != null && courseRepository.existsById(id)) {
            return id;
        }
        String key = str(keyValue);
        if (key == null || key.isBlank()) return id;
        if (key.matches("\\d+")) {
            Long numeric = Long.parseLong(key);
            if (courseRepository.existsById(numeric)) {
                return numeric;
            }
        }
        return courseRepository.findBySlug(key)
                .map(course -> course.getId())
                .orElse(id);
    }
}
