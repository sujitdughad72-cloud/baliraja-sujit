package com.baliraja.repository;

import com.baliraja.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId OR n.user IS NULL ORDER BY n.createdAt DESC")
    List<Notification> findNotificationsForUser(@Param("userId") Long userId);

    List<Notification> findByUserIdIsNullOrderByCreatedAtDesc();

    List<Notification> findByUserIdAndIsReadFalse(Long userId);
}
