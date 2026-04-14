package com.gunes.docker.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    @GetMapping("/")
    public String index() {
        return "Otomatik Dağıtım Başarılı! Jenkins ve Docker görev başında.";
    }
}