import sys
from PIL import Image

def remove_white(src, dst):
    img = Image.open(src).convert("RGBA")
    data = img.getdata()
    newData = []
    for item in data:
        # replace white with transparent
        if item[0] > 235 and item[1] > 235 and item[2] > 235:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    # Resize slightly for favicon if needed, but modern browsers handle it
    img.thumbnail((256, 256))
    img.save(dst, "PNG")

remove_white(r"c:\CampusFlow\frontend\src\assets\crmc-logo.webp", r"c:\CampusFlow\frontend\public\favicon.png")
print("Done")
