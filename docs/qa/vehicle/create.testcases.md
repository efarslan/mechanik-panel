# Test Cases – Create Vehicle Feature

## 1. Test Scope
This document defines test cases for validating the Create Vehicle feature, including positive, negative, and edge scenarios.

---

## 2. Preconditions
- User is logged in
- User belongs to a business
- User has permission to create vehicles

---

## 3. Test Cases

### TC-01 – Successful Vehicle Creation (Positive Case)

**Steps:**
1. Open Create Vehicle form
2. Enter valid Plate Number
3. Enter Brand
4. Enter Model
5. Enter Year
6. Click Submit

**Expected Result:**
- Vehicle is successfully created
- Vehicle appears in vehicle list
- Success message is displayed

---

### TC-02 – Missing Required Fields

**Steps:**
1. Open Create Vehicle form
2. Leave required fields empty
3. Click Submit

**Expected Result:**
- Validation errors are displayed
- Vehicle is NOT created

---

### TC-03 – Duplicate Plate Number

**Steps:**
1. Create a vehicle with plate "34ABC123"
2. Try to create another vehicle with same plate
3. Click Submit

**Expected Result:**
- System shows "duplicate plate" error
- Second vehicle is NOT created

---

### TC-04 – Invalid Year Value

**Steps:**
1. Enter a year greater than current year
2. Submit form

**Expected Result:**
- Validation error is shown
- Vehicle is NOT created

---

### TC-05 – Unauthorized Access

**Steps:**
1. Try accessing Create Vehicle page without permission

**Expected Result:**
- Access is denied
- User is redirected or shown error

---

### TC-06 – Network Failure During Submit

**Steps:**
1. Fill form correctly
2. Disconnect network before submit
3. Click Submit

**Expected Result:**
- Error message is shown
- No partial data is saved

---

## 4. Test Data

- Plate: 34ABC123
- Brand: Toyota
- Model: Corolla
- Year: 2020

---

## 5. Expected Coverage

- Positive scenarios ✔
- Validation errors ✔
- Business rules ✔
- Security checks ✔
- Network failures ✔