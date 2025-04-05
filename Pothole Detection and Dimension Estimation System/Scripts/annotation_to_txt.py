import os
import xml.etree.ElementTree as ET

image_dir = 'data/images'
annotation_dir = 'data/annotations'
output_dir = 'data/labels'

os.makedirs(output_dir, exist_ok=True)

def convert(size, box):
    dw = 1. / size[0]
    dh = 1. / size[1]
    x = (box[0] + box[1]) / 2.0 - 1
    y = (box[2] + box[3]) / 2.0 - 1
    w = box[1] - box[0]
    h = box[3] - box[2]
    x = x * dw
    w = w * dw
    y = y * dh
    h = h * dh
    return (x, y, w, h)

for xml_file in os.listdir(annotation_dir):
    if xml_file.endswith('.xml'):
        tree = ET.parse(os.path.join(annotation_dir, xml_file))
        root = tree.getroot()

        size = root.find('size')
        w = int(size.find('width').text)
        h = int(size.find('height').text)

        output_file = os.path.join(output_dir, os.path.splitext(xml_file)[0] + '.txt')

        with open(output_file, 'w') as f:
            for obj in root.iter('object'):
                cls = obj.find('name').text
                if cls == "pothole":
                    cls_id = 0

                    xmlbox = obj.find('bndbox')
                    b = (float(xmlbox.find('xmin').text), float(xmlbox.find('xmax').text),
                         float(xmlbox.find('ymin').text), float(xmlbox.find('ymax').text))

                    bb = convert((w, h), b)
                    f.write(f"{cls_id} " + " ".join([str(a) for a in bb]) + '\n')
