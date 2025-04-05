import os
import xml.etree.ElementTree as ET

def convert_voc_to_yolo(voc_dir, yolo_dir, images_dir):
    if not os.path.exists(yolo_dir):
        os.makedirs(yolo_dir)
    
    for xml_file in os.listdir(voc_dir):
        if not xml_file.endswith(".xml"):
            continue
        
        tree = ET.parse(os.path.join(voc_dir, xml_file))
        root = tree.getroot()
        
        size = root.find("size")
        img_width = int(size.find("width").text)
        img_height = int(size.find("height").text)
        
        base_filename = os.path.splitext(xml_file)[0]
        with open(os.path.join(yolo_dir, f"{base_filename}.txt"), "w") as yolo_file:
            for obj in root.findall("object"):
                class_name = obj.find("name").text
                if class_name == "pothole":
                    class_id = 0
                else:
                    continue
                
                bndbox = obj.find("bndbox")
                xmin = int(bndbox.find("xmin").text)
                ymin = int(bndbox.find("ymin").text)
                xmax = int(bndbox.find("xmax").text)
                ymax = int(bndbox.find("ymax").text)
                
                x_center = (xmin + xmax) / 2.0 / img_width
                y_center = (ymin + ymax) / 2.0 / img_height
                width = (xmax - xmin) / img_width
                height = (ymax - ymin) / img_height
                
                yolo_file.write(f"{class_id} {x_center} {y_center} {width} {height}\n")

# Example usage:
voc_annotations_dir = "data/annotations/"
yolo_labels_dir = "data/labels/"
images_dir = "data/images/"
convert_voc_to_yolo(voc_annotations_dir, yolo_labels_dir, images_dir)
