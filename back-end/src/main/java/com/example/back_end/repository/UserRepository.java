package com.example.back_end.repository;

import com.example.back_end.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findAllByOrderByIdAsc(Pageable pageable);
    Optional<User> findByEmailIgnoreCase(String email);
}
