package com.dern.repository;

import com.dern.model.SosEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SosEventRepository extends JpaRepository<SosEvent, Long> {
}