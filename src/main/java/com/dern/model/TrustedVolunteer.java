package com.dern.model;

import jakarta.persistence.*;

@Entity
@Table(name = "trusted_volunteers")
public class TrustedVolunteer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long volunteerId;

    public TrustedVolunteer() {
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getVolunteerId() {
        return volunteerId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setVolunteerId(Long volunteerId) {
        this.volunteerId = volunteerId;
    }
}