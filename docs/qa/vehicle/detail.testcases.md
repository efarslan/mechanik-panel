# Test Cases – Vehicle Detail Feature

## 1. Test Scope
This document defines test cases for validating Vehicle Detail Page, including vehicle data display, service history, authorization, and edge cases.

---

## 2. Preconditions
- User is authenticated
- User belongs to a business (tenant)
- Vehicle exists in system
- Vehicle has or has not service history

---

## 3. Test Cases

---

### TC-01 – View Vehicle Detail Successfully (With Service History)

**Steps:**
1. Login to system
2. Select a vehicle from list
3. Open Vehicle Detail page

**Expected Result:**
- Vehicle information is displayed correctly
- Service history is displayed in descending date order
- No data mismatch occurs

---

### TC-02 – View Vehicle Detail (No Service History)

**Steps:**
1. Open vehicle that has no service records

**Expected Result:**
- Vehicle information is displayed
- Empty state message is shown for service history
- No system error occurs

---

### TC-03 – Vehicle Not Found

**Steps:**
1. Try to access vehicle detail using invalid or deleted vehicle ID

**Expected Result:**
- System shows "Vehicle not found" message or 404 page
- No data is displayed

---

### TC-04 – Unauthorized Access

**Steps:**
1. Try to access vehicle belonging to another business

**Expected Result:**
- Access is denied
- Error or redirect occurs
- No sensitive data is exposed

---

### TC-05 – Service History Sorting Validation

**Steps:**
1. Open vehicle with multiple service records

**Expected Result:**
- Service records are sorted by date (newest → oldest)
- Order is consistent across refresh

---

### TC-06 – Large Service History Load (Performance)

**Steps:**
1. Open vehicle with high number of service records (100+)

**Expected Result:**
- Page loads within acceptable time
- No UI freezing
- Data remains complete

---

### TC-07 – Partial/Missing Service Data

**Steps:**
1. Open vehicle with incomplete service records

**Expected Result:**
- System handles missing fields gracefully
- No crash or broken UI occurs
- Available data is still shown

---

### TC-08 – Data Consistency Check

**Steps:**
1. Compare vehicle summary data with detail view

**Expected Result:**
- Data is consistent across system
- No mismatched fields (brand, plate, etc.)

---

## 4. Test Data Examples

- Vehicle: Toyota Corolla 2020
- Plate: 34ABC123
- Service Count: 0 / 5 / 100+
- User roles: Admin / Service Advisor

---

## 5. Coverage Summary

- Positive scenarios ✔
- Negative scenarios ✔
- Authorization ✔
- Data integrity ✔
- Performance ✔
- Edge cases ✔