package com.shiftsync.shift.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods = false)
public class SchedulingTransactionConfiguration {
    // Reject accidental joining of a weaker outer transaction instead of silently
    // ignoring the SERIALIZABLE declarations on schedule mutation services.
    @Bean
    static BeanPostProcessor validateSchedulingTransactionIsolation() {
        return new BeanPostProcessor() {
            @Override public Object postProcessAfterInitialization(Object bean, String name) {
                if (bean instanceof AbstractPlatformTransactionManager manager) {
                    manager.setValidateExistingTransaction(true);
                }
                return bean;
            }
        };
    }

    // Marketplace claims use a programmatic boundary inside their Redis lock.
    @Bean
    TransactionTemplate transactionTemplate(PlatformTransactionManager manager) {
        TransactionTemplate template = new TransactionTemplate(manager);
        template.setIsolationLevel(TransactionDefinition.ISOLATION_SERIALIZABLE);
        return template;
    }
}
