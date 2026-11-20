'''Automated loan approval module.'''

print("===== LOAN APPROVAL SYSTEM =====")

name = input("Enter your name: ")
credit_score = int(input("Enter your credit score: "))
income = float(input("Enter your monthly income: "))
existing_loan = input("Do you have an existing loan? (yes/no): ")

if credit_score >= 750 and income >= 25000 and existing_loan == "no":
    print("Loan Approved for", name)

elif credit_score >= 650 and income > 30000 and existing_loan == "no":
    print("Loan Approved with conditions")

elif credit_score < 650:
    print("Loan Rejected due to low credit score")

else:
    print("Loan Rejected")

print("Thank you for using our system")
