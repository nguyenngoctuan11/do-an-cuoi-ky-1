package com.example.back_end.service;

import com.example.back_end.model.User;
import com.example.back_end.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getSampleUsers(int limit) {
        return userRepository.findAllByOrderByIdAsc(PageRequest.of(0, limit));
    }
}

