import json
import matplotlib.pyplot as plt

# Load data from JSON file
with open('language_adoption.json', 'r') as file:
    data = json.load(file)

# Gather language names and adoption percentages
languages = list(data.keys())
adoption_percentages = [data[language]['adoptionPercentage'] for language in languages]

# Calculate the total number of projects
total_projects = sum(lang['totalProjects'] for lang in data.values())

# Calculate the percentage of total projects for each language
percentages = {lang: (data[lang]['totalProjects'] / total_projects * 100) for lang in data.keys()}
percentage_labels = [f"{percentages[language]:.2f}%" for language in languages]

# Setup the figure and axes for the bar chart
plt.figure(figsize=(12, 8))
bars = plt.bar(languages, adoption_percentages, color='skyblue')

# Annotate each bar with the percentage of total projects
for bar, label in zip(bars, percentage_labels):
    yval = bar.get_height()
    plt.text(bar.get_x() + bar.get_width() / 2, yval + 1, label, va='bottom', ha='center', fontsize=9, color='black')

# Set chart labels, title, and axes properties
plt.xlabel('Programming Languages')
plt.ylabel('Adoption Percentage (%)')
plt.title('Programming Language Adoption Rates with Share of Total Projects')
plt.xticks(rotation=45, ha='right')
plt.ylim(0, 100)  # Set y-axis limit to accommodate annotation

# Tight layout for better spacing and save the plot as a file
plt.tight_layout()
plt.savefig('/Users/umarmahmood/GraphPy/language_adoption.png')
plt.close()
