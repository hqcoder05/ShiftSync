ALTER TABLE scheduler_configuration RENAME COLUMN priority_weight TO rest_time_weight;

ALTER TABLE scheduler_configuration DROP CONSTRAINT chk_weights_sum;

ALTER TABLE scheduler_configuration
  ADD CONSTRAINT chk_weights_sum
  CHECK (fairness_weight + skill_weight + hour_weight + rest_time_weight + availability_weight = 1.000);
