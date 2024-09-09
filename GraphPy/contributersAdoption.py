import json
import matplotlib.pyplot as plt
import numpy as np

# Load the data from the JSON file
with open('contributers-adoption.json', 'r')  as file: 
    data = json.load(file)

# Parameters for plotting
bar_width = 0.15  # width of each bar
spacing = 0.05    # space between groups
group_labels = list(data.keys())
group_positions = np.arange(len(group_labels))

# Create a figure and an axis
fig, ax = plt.subplots(figsize=(15, 6))

# Loop over each group of stars and plot bars
for group_index, (group_label, bars) in enumerate(data.items()):
    # Calculate the offset for each group
    bar_positions = group_positions[group_index] + (np.arange(len(bars)) - len(bars) / 2) * (bar_width + spacing)
    adoption_rates = [bar_info['adoptionRate'] for bar_info in bars.values()]
    ax.bar(bar_positions, adoption_rates, bar_width, label=f'Group {group_label}')

# Set the labels and titles
ax.set_xlabel('Number of Contributers')
ax.set_ylabel('Adoption Rate (%)')
ax.set_title('Adoption Rate by Number of contributers')
ax.set_xticks(group_positions)
ax.set_xticklabels(group_labels)

# Optional: Add a legend if you want to identify the groups
# ax.legend(title="Group", bbox_to_anchor=(1.05, 1), loc='upper left')

# Show the plot
plt.tight_layout()  # Adjust layout to fit

#plt.savefig('/Users/umarmahmood/GraphPy/stars_adoption.png')
plt.savefig('/Users/umarmahmood/GraphPy/contributers_adoption.png')
plt.close()

