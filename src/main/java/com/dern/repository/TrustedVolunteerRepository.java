package com.dern.repository;

import com.dern.model.TrustedVolunteer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrustedVolunteerRepository extends JpaRepository<TrustedVolunteer, Long> {
    List<TrustedVolunteer> findByUserId(Long userId);
}