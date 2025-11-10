package com.example.back_end.service;

import jakarta.mail.internet.InternetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final String DEFAULT_FROM = "noreply@yourlms.local";

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public MailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                       @Value("${app.mail.from:noreply@yourlms.local}") String fromAddress) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.fromAddress = fromAddress;
    }

    public void sendOtpEmail(String to, String subject, String code, int expireMinutes) {
        if (mailSender == null) {
            log.info("MailSender not configured. OTP for {} is {} (expires {} min).", to, code, expireMinutes);
            return;
        }
        try {
            var mimeMessage = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
            helper.setTo(to);
            helper.setFrom(parseAddress(fromAddress));
            helper.setSubject(subject);
            helper.setText("Mã OTP của bạn là: " + code + "\nMã sẽ hết hạn sau " + expireMinutes + " phút.", false);
            mailSender.send(mimeMessage);
        } catch (Exception ex) {
            log.warn("Không thể gửi email OTP tới {}: {}", to, ex.getMessage());
        }
    }

    private InternetAddress parseAddress(String raw) throws Exception {
        if (raw == null || raw.isBlank()) {
            raw = DEFAULT_FROM;
        }
        if (raw.contains("<") && raw.contains(">")) {
            String name = raw.substring(0, raw.indexOf("<")).trim();
            String email = raw.substring(raw.indexOf("<") + 1, raw.indexOf(">")).trim();
            return new InternetAddress(email, name, StandardCharsets.UTF_8.displayName());
        }
        return new InternetAddress(raw.trim());
    }
}
