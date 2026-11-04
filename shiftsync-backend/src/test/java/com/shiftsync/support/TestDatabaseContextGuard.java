package com.shiftsync.support;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

/** Recheck after test context customizers, before datasource beans are created. */
public class TestDatabaseContextGuard implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    @Override public void initialize(ConfigurableApplicationContext context) {
        context.addBeanFactoryPostProcessor(factory -> TestDatabaseGuard.verify(context.getEnvironment()));
    }
}
