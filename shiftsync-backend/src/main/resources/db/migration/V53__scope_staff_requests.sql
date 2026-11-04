ALTER TABLE staff_requests ADD COLUMN requester_id uuid REFERENCES staff(id);
ALTER TABLE staff_requests ADD COLUMN store_id uuid REFERENCES store(id);
CREATE INDEX idx_staff_requests_requester ON staff_requests(requester_id);
CREATE INDEX idx_staff_requests_store ON staff_requests(store_id);
