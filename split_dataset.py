import os
import shutil
import random

images_path = "D:/AMC/dataset/images"
labels_path = "D:/AMC/dataset/labels"

train_images = "D:/AMC/dataset/images/train"
val_images   = "D:/AMC/dataset/images/val"
train_labels = "D:/AMC/dataset/labels/train"
val_labels   = "D:/AMC/dataset/labels/val"

os.makedirs(train_images, exist_ok=True)
os.makedirs(val_images, exist_ok=True)
os.makedirs(train_labels, exist_ok=True)
os.makedirs(val_labels, exist_ok=True)

all_images = [f for f in os.listdir(images_path) if f.endswith((".jpg", ".png"))]
random.shuffle(all_images)

split_idx = int(0.8 * len(all_images))
train_files = all_images[:split_idx]
val_files   = all_images[split_idx:]

# Copy train images + labels
for f in train_files:
    shutil.copy(os.path.join(images_path, f), train_images)
    label_file = os.path.splitext(f)[0] + ".txt"
    shutil.copy(os.path.join(labels_path, label_file), train_labels)

# Copy val images + labels
for f in val_files:
    shutil.copy(os.path.join(images_path, f), val_images)
    label_file = os.path.splitext(f)[0] + ".txt"
    shutil.copy(os.path.join(labels_path, label_file), val_labels)

print("Dataset successfully split into train and val folders!")
