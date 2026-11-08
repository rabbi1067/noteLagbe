import re

# 1. Update BrandLogo.tsx
with open('frontend/src/components/BrandLogo.tsx', 'r', encoding='utf-8') as f:
    brand = f.read()

brand = brand.replace('sm: "w-8 h-8"', 'sm: "w-7 h-7 sm:w-8 sm:h-8"')
brand = brand.replace('md: "w-9 h-9 sm:w-10 sm:h-10"', 'md: "w-8 h-8 sm:w-10 sm:h-10"')
brand = brand.replace('sm: "text-base"', 'sm: "text-sm sm:text-base"')
brand = brand.replace('md: "text-lg sm:text-xl"', 'md: "text-base sm:text-xl"')

with open('frontend/src/components/BrandLogo.tsx', 'w', encoding='utf-8') as f:
    f.write(brand)

print("BrandLogo updated successfully.")
