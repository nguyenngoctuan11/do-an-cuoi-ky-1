package com.example.back_end.repository;

import com.example.back_end.model.Post;
import com.example.back_end.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Optional<Post> findBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);

    @Query("SELECT p FROM Post p " +
            "WHERE (:status IS NULL OR p.status = :status) " +
            "AND (:courseId IS NULL OR (p.course IS NOT NULL AND p.course.id = :courseId)) " +
            "AND (:visibility IS NULL OR p.visibility = :visibility) " +
            "AND (:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Post> search(
            @Param("status") String status,
            @Param("courseId") Long courseId,
            @Param("visibility") String visibility,
            @Param("keyword") String keyword,
            Pageable pageable);

    Page<Post> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);

    Page<Post> findByAuthorAndStatusInOrderByCreatedAtDesc(User author, Collection<String> statuses, Pageable pageable);

    Page<Post> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
