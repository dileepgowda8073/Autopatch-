"""Automated loan approval module."""

print("===== LOAN APPROVAL SYSTEM =====")

name = input("Enter your name: ")

try:
    credit_score = int(input("Enter your credit score: "))
except ValueError:
    print("Error: Credit score must be a number.")
    exit(1)

try:
    income = float(input("Enter your monthly income: "))
except ValueError:
    print("Error: Income must be a number.")
    exit(1)

existing_loan = input("Do you have an existing loan? (yes/no): ").strip().lower()

if existing_loan not in ("yes", "no"):
    print("Error: Please enter 'yes' or 'no'.")
    exit(1)

if credit_score >= 750 and income >= 25000 and existing_loan == "no":
    print("Loan Approved for", name)

elif credit_score >= 650 and income >= 25000 and existing_loan == "no":
    print("Loan Approved with conditions")

elif credit_score < 650:
    print("Loan Rejected due to low credit score")

elif existing_loan == "yes":
    print("Loan Rejected due to existing loan")

else:
    print("Loan Rejected")

print("Thank you for using our system")
